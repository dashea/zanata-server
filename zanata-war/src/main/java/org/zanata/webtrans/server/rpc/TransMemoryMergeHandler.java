/*
 * Copyright 2012, Red Hat, Inc. and individual contributors as indicated by the
 * @author tags. See the copyright.txt file in the distribution for a full
 * listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * This software is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this software; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA, or see the FSF
 * site: http://www.fsf.org.
 */

package org.zanata.webtrans.server.rpc;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.testng.collections.Lists;
import org.zanata.common.ContentState;
import org.zanata.dao.TextFlowDAO;
import org.zanata.model.HLocale;
import org.zanata.model.HTextFlow;
import org.zanata.model.HTextFlowTarget;
import org.zanata.service.SecurityService;
import org.zanata.webtrans.server.ActionHandlerFor;
import org.zanata.webtrans.server.TranslationWorkspace;
import org.zanata.webtrans.shared.model.TransMemoryDetails;
import org.zanata.webtrans.shared.model.TransMemoryQuery;
import org.zanata.webtrans.shared.model.TransMemoryResultItem;
import org.zanata.webtrans.shared.model.TransUnitUpdateInfo;
import org.zanata.webtrans.shared.model.TransUnitUpdateRequest;
import org.zanata.webtrans.shared.rpc.HasSearchType.SearchType;
import org.zanata.webtrans.shared.rpc.TransMemoryMerge;
import org.zanata.webtrans.shared.rpc.TransUnitUpdated;
import org.zanata.webtrans.shared.rpc.UpdateTransUnitResult;

import com.google.common.base.Predicate;
import com.google.common.collect.ImmutableMap;

import lombok.extern.slf4j.Slf4j;
import net.customware.gwt.dispatch.server.ExecutionContext;
import net.customware.gwt.dispatch.shared.ActionException;
import static com.google.common.collect.Collections2.*;
import static org.zanata.service.SecurityService.TranslationAction.*;

@Name("webtrans.gwt.TransMemoryMergeHandler")
@Scope(ScopeType.STATELESS)
@ActionHandlerFor(TransMemoryMerge.class)
@Slf4j
public class TransMemoryMergeHandler extends AbstractActionHandler<TransMemoryMerge, UpdateTransUnitResult>
{

   @In(value = "webtrans.gwt.GetTransMemoryHandler", create = true)
   private GetTransMemoryHandler getTransMemoryHandler;

   @In(value = "webtrans.gwt.GetTransMemoryDetailsHandler", create = true)
   private GetTransMemoryDetailsHandler getTransMemoryDetailsHandler;

   @In(value = "webtrans.gwt.UpdateTransUnitHandler", create = true)
   private UpdateTransUnitHandler updateTransUnitHandler;
   
   @In
   private SecurityService securityServiceImpl;
   
   @In
   private TextFlowDAO textFlowDAO;

   @Override
   public UpdateTransUnitResult execute(TransMemoryMerge action, ExecutionContext context) throws ActionException
   {
      SecurityService.SecurityCheckResult securityCheckResult = securityServiceImpl.checkPermission(action, MODIFY);
      HLocale hLocale = securityCheckResult.getLocale();
      TranslationWorkspace workspace = securityCheckResult.getWorkspace();

      Map<Long, TransUnitUpdateRequest> requestMap = transformToMap(action.getUpdateRequests());
      List<HTextFlow> hTextFlows = textFlowDAO.findByIdList(Lists.newArrayList(requestMap.keySet()));

      // FIXME this won't scale well (copy from GetTransMemoryHandler)
      List<Long> idsWithTranslations = textFlowDAO.findIdsWithTranslations(hLocale.getLocaleId());

      TransMemoryAboveThresholdPredicate predicate = new TransMemoryAboveThresholdPredicate(action.getThresholdPercent());

      List<TransUnitUpdateRequest> updateRequests = Lists.newArrayList();
      for (HTextFlow hTextFlow : hTextFlows)
      {
         HTextFlowTarget hTextFlowTarget = hTextFlow.getTargets().get(hLocale.getId());
         if (hTextFlowTarget != null && hTextFlowTarget.getState() != ContentState.New)
         {
            log.warn("Text flow id {} is not untranslated. Ignored.", hTextFlow.getId());
            continue;
         }
         ArrayList<TransMemoryResultItem> tmResults = getTransMemoryHandler.searchTransMemory(hLocale, new TransMemoryQuery(hTextFlow.getContents(), SearchType.FUZZY_PLURAL), idsWithTranslations);
         TransMemoryResultItem tmResult = findTMAboveThreshold(tmResults, predicate);
         TransUnitUpdateRequest request = createRequest(action, hLocale, requestMap, hTextFlow, tmResult);
         if (request != null)
         {
            updateRequests.add(request);
         }
      }

      if (updateRequests.isEmpty())
      {
         return new UpdateTransUnitResult();
      }
      return updateTransUnitHandler.doTranslation(hLocale.getLocaleId(), workspace, updateRequests, action.getEditorClientId(), TransUnitUpdated.UpdateType.TMMerge);
   }

   private Map<Long, TransUnitUpdateRequest> transformToMap(List<TransUnitUpdateRequest> updateRequests)
   {
      ImmutableMap.Builder<Long, TransUnitUpdateRequest> mapBuilder = ImmutableMap.builder();
      for (TransUnitUpdateRequest updateRequest : updateRequests)
      {
         mapBuilder.put(updateRequest.getTransUnitId().getId(), updateRequest);
      }
      return mapBuilder.build();
   }

   private TransMemoryResultItem findTMAboveThreshold(ArrayList<TransMemoryResultItem> tmResults, TransMemoryAboveThresholdPredicate predicate)
   {
      Collection<TransMemoryResultItem> aboveThreshold = filter(tmResults, predicate);
      if (aboveThreshold.size() > 0)
      {
         return aboveThreshold.iterator().next();
      }
      else
      {
         return null;
      }
   }

   private TransUnitUpdateRequest createRequest(TransMemoryMerge action, HLocale hLocale, Map<Long, TransUnitUpdateRequest> requestMap, HTextFlow hTextFlowToBeFilled, TransMemoryResultItem tmResult)
   {
      if (tmResult == null)
      {
         return null;
      }
      Long tmSourceId = tmResult.getSourceIdList().get(0);
      HTextFlow tmSource = textFlowDAO.findById(tmSourceId, false);
      TransMemoryDetails tmDetail = getTransMemoryDetailsHandler.getTransMemoryDetail(hLocale, tmSource);
      ContentState statusToSet = TransMemoryMergeStatusResolver.newInstance().workOutStatus(action, hTextFlowToBeFilled, tmDetail, tmResult);
      if (statusToSet != null)
      {
         TransUnitUpdateRequest unfilledRequest = requestMap.get(hTextFlowToBeFilled.getId());
         TransUnitUpdateRequest request = new TransUnitUpdateRequest(unfilledRequest.getTransUnitId(), tmResult.getTargetContents(), statusToSet, unfilledRequest.getBaseTranslationVersion());
         request.addTargetComment("auto translated by TM merge");
         log.debug("auto translate from translation memory {}", request);
         return request;
      }
      return null;
   }

   @Override
   public void rollback(TransMemoryMerge action, UpdateTransUnitResult result, ExecutionContext context) throws ActionException
   {
   }

   private static class TransMemoryAboveThresholdPredicate implements Predicate<TransMemoryResultItem>
   {
      private final int approvedThreshold;

      public TransMemoryAboveThresholdPredicate(int approvedThreshold)
      {
         this.approvedThreshold = approvedThreshold;
      }

      @Override
      public boolean apply(TransMemoryResultItem tmResult)
      {
         return tmResult.getSimilarityPercent() >= approvedThreshold;
      }
   }
}