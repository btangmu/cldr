package org.unicode.cldr.web.api;

import java.util.ArrayList;
import java.util.List;
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
@Path("/announce")
@Tag(name = "announce", description = "APIs for Survey Tool announcements")
public class Announcements {
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get announcements", description = "Get announcements")
    @APIResponses(
            value = {
                @APIResponse(
                        responseCode = "200",
                        description = "Announcements",
                        content =
                                @Content(
                                        mediaType = "application/json",
                                        schema =
                                                @Schema(
                                                        implementation =
                                                                AnnouncementResponse.class))),
                @APIResponse(responseCode = "503", description = "Not ready yet"),
                @APIResponse(
                        responseCode = "500",
                        description = "Internal Server Error",
                        content =
                                @Content(
                                        mediaType = "application/json",
                                        schema = @Schema(implementation = STError.class))),
            })
    public Response getAnnouncements(@HeaderParam(Auth.SESSION_HEADER) String sessionString) {
        CookieSession session = Auth.getSession(sessionString);
        if (session == null) {
            return Auth.noSessionResponse();
        }
        if (!UserRegistry.userIsGuest(session.user)) { // userIsGuest means "is guest or stronger"
            return Response.status(403, "Forbidden").build();
        }
        session.userDidAction();
        if (SurveyMain.isBusted() || !SurveyMain.wasInitCalled() || !SurveyMain.triedToStartUp()) {
            return STError.surveyNotQuiteReady();
        }
        AnnouncementResponse response = new AnnouncementResponse();
        return Response.ok(response).build();
    }

    @Schema(description = "Set of announcements")
    public static final class AnnouncementResponse {
        @Schema(description = "announcements")
        public Announcement[] announcements;

        public AnnouncementResponse() {
            String body1 =
                    "<p>This is a test including some html.<p>Paragraph.<p><i>Italic.</i> <b>Bold.</b> <a href='https://unicode.org'>Link to unicode.org</a>";
            String body2 = "This is a test \uD83D\uDC40 and it's generated on the back end";
            List<Announcement> announcementList = new ArrayList<>();
            announcementList.add(
                    new Announcement(
                            "backend@example.com", "2023-01-17 12:30:03.0", "Wow!", body1, false));
            announcementList.add(
                    new Announcement(
                            "server@unicode.org",
                            "2022-12-31 01:22:22.0",
                            "This is really so important",
                            body2,
                            true));
            announcements = announcementList.toArray(new Announcement[0]);
        }
    }

    @Schema(description = "Single announcement")
    public static class Announcement {
        @Schema(description = "poster")
        public String poster;

        @Schema(description = "date")
        public String date;

        @Schema(description = "subject")
        public String subject;

        @Schema(description = "body")
        public String body;

        @Schema(description = "checked")
        public boolean checked;

        public Announcement(
                String poster, String date, String subject, String body, boolean checked) {
            this.poster = poster;
            this.date = date;
            this.subject = subject;
            this.body = body;
            this.checked = checked;
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Submit an announcement", description = "Submit an announcement")
    @APIResponses(
            value = {
                @APIResponse(
                        responseCode = "200",
                        description = "Announcement submitted (but check result status)",
                        content =
                                @Content(
                                        mediaType = "application/json",
                                        schema = @Schema(implementation = Response.class))),
                @APIResponse(
                        responseCode = "401",
                        description = "Authorization required, send a valid session id"),
                @APIResponse(responseCode = "403", description = "Forbidden, no access"),
                @APIResponse(
                        responseCode = "500",
                        description = "Internal Server Error",
                        content =
                                @Content(
                                        mediaType = "application/json",
                                        schema = @Schema(implementation = STError.class))),
            })
    public Response submitAnnouncement(
            @HeaderParam(Auth.SESSION_HEADER) String session,
            AnnouncementSubmissionRequest request) {
        final CookieSession mySession = Auth.getSession(session);
        if (mySession == null) {
            return Auth.noSessionResponse();
        }
        System.out.println(
                "submitAnnouncement got: subject="
                        + request.subject
                        + " body="
                        + request.body
                        + " audience="
                        + request.audience
                        + " orgsAll="
                        + request.orgsAll
                        + " locales="
                        + request.locales);
        final AnnouncementSubmissionResponse r = new AnnouncementSubmissionResponse();
        return Response.ok().entity(r).build();
    }

    public static class AnnouncementSubmissionRequest {

        /**
         * A constructor without parameters prevents serialization error, "No default constructor
         * found"
         */
        public AnnouncementSubmissionRequest() {
            this.subject = "";
            this.body = "";
        }

        @Schema(description = "subject")
        public String subject;

        @Schema(description = "body")
        public String body;

        @Schema(description = "audience")
        public String audience = "Everyone";

        @Schema(description = "locales")
        public String locales = "";

        @Schema(description = "orgsAll")
        public Boolean orgsAll = false;
    }

    public static class AnnouncementSubmissionResponse {

        @Schema(description = "ok")
        public final boolean ok = true;
    }
}
