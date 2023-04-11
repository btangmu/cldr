package org.unicode.cldr.web.api;

import java.sql.Array;
import java.util.*;
import java.util.concurrent.ExecutionException;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.unicode.cldr.util.CLDRLocale;
import org.unicode.cldr.util.Organization;
import org.unicode.cldr.web.CookieSession;
import org.unicode.cldr.web.UserRegistry;

@Path("/disputes")
@Tag(name = "disputes", description = "Get data about Survey Tool disputes")
public class Disputes {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get Disputes", description = "This handles a request for Survey Tool dispute data")
    @APIResponses(
        value = {
            @APIResponse(
                responseCode = "200",
                description = "Results of Disputes request",
                content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DisputesResponse.class)
                )
            ),
        }
    )
    public Response getDisputes(@HeaderParam(Auth.SESSION_HEADER) String sessionString) {
        CookieSession.checkForExpiredSessions();
        if (sessionString == null || sessionString.isEmpty()) {
            return Response.status(401, "No session string").build();
        }
        final CookieSession session = CookieSession.retrieve(sessionString);
        if (session == null) {
            return Response.status(401, "No session").build();
        }
        if (!UserRegistry.userCanSeeDisputes(session.user)) {
            return Response.status(403, "Forbidden").build();
        }
        try {
            DisputesResponse response = reallyGetDisputes(session.user.getOrganization());
            return Response.ok(response, MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.status(500, "An exception occurred").entity(e).build();
        }
    }

    private DisputesResponse reallyGetDisputes(Organization org) {
        DisputesResponse response = new DisputesResponse();
        response.add(
            org,
            CLDRLocale.getInstance("aa"),
            "//ldml/units/unitLength[@type=\"long\"]/unit[@type=\"duration-decade\"]/displayName"
        );
        response.add(
            org,
            CLDRLocale.getInstance("es_MX"),
            "//ldml/units/unitLength[@type=\"narrow\"]/unit[@type=\"power-horsepower\"]/displayName"
        );
        return response;
    }

    @Schema(description = "Response for Disputes query")
    public static final class DisputesResponse {

        public List<DisputeItem> disputes = new ArrayList<>();

        public void add(Organization org, CLDRLocale locale, String xpath) {
            DisputeItem di = new DisputeItem(org, locale, xpath);
            disputes.add(di);
        }
    }

    public static final class DisputeItem {

        public String org;
        public String locale;
        public String xpath;

        public DisputeItem(Organization org, CLDRLocale locale, String xpath) {
            this.org = org.toString();
            this.locale = locale.getBaseName();
            this.xpath = xpath;
        }
    }
}
