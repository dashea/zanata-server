package org.zanata.rest;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import lombok.extern.slf4j.Slf4j;

import org.jboss.resteasy.annotations.interception.SecurityPrecedence;
import org.jboss.resteasy.annotations.interception.ServerInterceptor;
import org.jboss.resteasy.core.ResourceMethod;
import org.jboss.resteasy.core.ServerResponse;
import org.jboss.resteasy.spi.Failure;
import org.jboss.resteasy.spi.HttpRequest;
import org.jboss.resteasy.spi.interception.PreProcessInterceptor;
import org.zanata.security.ZanataIdentity;

@SecurityPrecedence
@ServerInterceptor
@Slf4j
public class ZanataRestSecurityInterceptor implements PreProcessInterceptor {

    public static final String X_AUTH_TOKEN_HEADER = "X-Auth-Token";
    public static final String X_AUTH_USER_HEADER = "X-Auth-User";

    @Override
    public ServerResponse
            preProcess(HttpRequest request, ResourceMethod method)
                    throws Failure, WebApplicationException {

        String username =
                request.getHttpHeaders().getRequestHeaders()
                        .getFirst(X_AUTH_USER_HEADER);
        String apiKey =
                request.getHttpHeaders().getRequestHeaders()
                        .getFirst(X_AUTH_TOKEN_HEADER);

        if (username != null && apiKey != null) {
            ZanataIdentity.instance().getCredentials().setUsername(username);
            ZanataIdentity.instance().setApiKey(apiKey);
            ZanataIdentity.instance().tryLogin();
            if (!ZanataIdentity.instance().isLoggedIn()) {
                log.info(
                        "Failed attempt to authenticate REST request for user {}",
                        username);
                return ServerResponse.copyIfNotServerResponse(Response.status(
                        Status.UNAUTHORIZED).build());
            }
        }
        return null;
    }
}
