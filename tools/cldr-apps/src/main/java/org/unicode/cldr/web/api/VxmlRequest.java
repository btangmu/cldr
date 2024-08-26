package org.unicode.cldr.web.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.unicode.cldr.web.VxmlGeneratorQueue;
import org.unicode.cldr.web.VxmlGeneratorQueue.LoadingPolicy;

@Schema(description = "VXML Request")
public final class VxmlRequest {
    public VxmlRequest() {}

    @Schema(implementation = VxmlGeneratorQueue.LoadingPolicy.class, defaultValue = "NOSTART")
    public VxmlGeneratorQueue.LoadingPolicy loadingPolicy = LoadingPolicy.NOSTART;
}
