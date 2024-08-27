package org.unicode.cldr.web.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.unicode.cldr.web.VxmlQueue;
import org.unicode.cldr.web.VxmlQueue.LoadingPolicy;

@Schema(description = "VXML Request")
public final class VxmlRequest {
    public VxmlRequest() {}

    @Schema(implementation = VxmlQueue.LoadingPolicy.class, defaultValue = "NOSTART")
    public VxmlQueue.LoadingPolicy loadingPolicy = LoadingPolicy.NOSTART;
}
