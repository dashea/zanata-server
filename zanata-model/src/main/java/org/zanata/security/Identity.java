/*
 * Copyright 2015, Red Hat, Inc. and individual contributors
 * as indicated by the @author tags. See the copyright.txt file in the
 * distribution for a full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

package org.zanata.security;

import java.security.Principal;
import javax.security.auth.Subject;

/**
 * TODO move this to a separate module (zanata-seam, zanata-security?)
 * So that we can share code between zanata-war and zanata-test-war.
 *
 * @author Patrick Huang <a
 *         href="mailto:pahuang@redhat.com">pahuang@redhat.com</a>
 */
public interface Identity {
    void runAs(RunAsOperation operation);

    interface RunAsOperation {
        /**
         * All the operation logic should go into this method
         */
        void execute();

        Principal getPrincipal();

        Subject getSubject();

        boolean isSystemOperation();

        /**
         * Typically implementation of this method will be identity.run(this);
         * This is also the default implementation.
         */
        void run();
    }
}
