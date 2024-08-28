package org.unicode.cldr.web.api;

import java.io.IOException;
import javax.enterprise.context.ApplicationScoped;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.unicode.cldr.web.*;

@ApplicationScoped
@Path("/vxml")
@Tag(name = "Generate VXML", description = "APIs for Survey Tool VXML (Vetted XML) generation")
public class GenerateVxml {
    @POST
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Generate VXML", description = "Generate VXML")
    @APIResponses(
            value = {
                @APIResponse(
                        responseCode = "200",
                        description = "Generate VXML",
                        content =
                                @Content(
                                        mediaType = "application/json",
                                        schema = @Schema(implementation = VxmlResponse.class))),
                @APIResponse(responseCode = "403", description = "Forbidden"),
                @APIResponse(
                        responseCode = "500",
                        description = "Internal Server Error",
                        content =
                                @Content(
                                        mediaType = "application/json",
                                        schema = @Schema(implementation = STError.class))),
                @APIResponse(responseCode = "503", description = "Not ready yet"),
            })
    public Response generateVxml(
            VxmlRequest request, @HeaderParam(Auth.SESSION_HEADER) String sessionString) {
        try {
            CookieSession cs = Auth.getSession(sessionString);
            if (cs == null) {
                return Auth.noSessionResponse();
            }
            if (!UserRegistry.userIsAdmin(cs.user)) {
                return Response.status(Response.Status.FORBIDDEN).build();
            }
            if (SurveyMain.isBusted()
                    || !SurveyMain.wasInitCalled()
                    || !SurveyMain.triedToStartUp()) {
                return STError.surveyNotQuiteReady();
            }
            cs.userDidAction();
            VxmlQueue queue = VxmlQueue.getInstance();
            QueueMemberId qmi = new QueueMemberId(cs);
            VxmlResponse vr = getVxmlResponse(queue, qmi, request.loadingPolicy);
            return Response.ok(vr).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get the response for VXML
     *
     * @param queue the VxmlQueue
     * @param qmi the QueueMemberId
     * @param loadingPolicy the LoadingPolicy
     * @return the VxmlResponse
     * @throws IOException if thrown by VxmlQueue.getOutput
     */
    private VxmlResponse getVxmlResponse(
            VxmlQueue queue, QueueMemberId qmi, VxmlQueue.LoadingPolicy loadingPolicy)
            throws IOException {
        VxmlResponse response = new VxmlResponse();
        VxmlQueue.Args args = new VxmlQueue.Args(qmi, loadingPolicy);
        VxmlQueue.Results results = new VxmlQueue.Results();

        // compare VettingViewerQueue.getPriorityItemsSummaryOutput
        response.message = queue.getOutput(args, results);
        response.percent = queue.getPercent();
        response.status = results.status;
        response.output = results.output.toString();
        return response;
    }

    @Schema(description = "VXML Response")
    public static final class VxmlResponse {
        public VxmlResponse() {}

        @Schema(description = "VXML Response status enum")
        public VxmlQueue.Status status;

        @Schema(description = "Current status message")
        public String message = "";

        @Schema(description = "Estimated percentage complete")
        public Number percent;

        @Schema(description = "Output on success")
        public String output;
    }
}
