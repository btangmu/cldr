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
        AnnouncementResponse response = new AnnouncementResponse(session.user);
        return Response.ok(response).build();
    }

    @Schema(description = "List of announcements")
    public static final class AnnouncementResponse {
        @Schema(description = "announcements")
        public Announcement[] announcements;

        public AnnouncementResponse(UserRegistry.User user) {
            List<Announcement> announcementList = new ArrayList<>();
            AnnouncementData.get(user, announcementList);
            announcements = announcementList.toArray(new Announcement[0]);
        }
    }

    @Schema(description = "Single announcement")
    public static class Announcement {
        @Schema(description = "announcement id as stored in database")
        public int id;

        @Schema(description = "poster id")
        public int poster;

        @Schema(description = "poster name")
        public String posterName;

        @Schema(description = "date")
        public String date;

        @Schema(description = "subject")
        public String subject;

        @Schema(description = "body")
        public String body;

        @Schema(description = "checked")
        public boolean checked;

        public Announcement(
                int id, int poster, String date, String subject, String body, boolean checked) {
            this.id = id;
            this.poster = poster;
            UserRegistry.User posterUser = CookieSession.sm.reg.getInfo(poster);
            this.posterName = (posterUser != null) ? posterUser.name : Integer.toString(id);
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
            @HeaderParam(Auth.SESSION_HEADER) String sessionString,
            AnnouncementSubmissionRequest request) {
        CookieSession session = Auth.getSession(sessionString);
        if (session == null) {
            return Auth.noSessionResponse();
        }
        if (!UserRegistry.userIsManagerOrStronger(session.user)
                || (request.orgsAll
                        && !UserRegistry.userIsTC(session.user))) { // userIsTC means TC or stronger
            return Response.status(403, "Forbidden").build();
        }
        final AnnouncementSubmissionResponse response = new AnnouncementSubmissionResponse();
        try {
            AnnouncementData.submit(request, response, session.user);
        } catch (SurveyException e) {
            throw new RuntimeException(e);
        }
        return Response.ok().entity(response).build();
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
        public boolean ok = false;

        @Schema(description = "err")
        public String err = "";
    }

    @POST
    @Path("/checkread")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Set already-read status",
            description = "Indicate whether an announcement has been read")
    @APIResponses(
            value = {
                @APIResponse(
                        responseCode = "200",
                        description = "Submitted",
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
    public Response checkRead(
            @HeaderParam(Auth.SESSION_HEADER) String sessionString, CheckReadRequest request) {
        CookieSession session = Auth.getSession(sessionString);
        if (session == null) {
            return Auth.noSessionResponse();
        }
        if (!UserRegistry.userIsGuest(session.user)) { // means guest or stronger
            return Response.status(403, "Forbidden").build();
        }
        final CheckReadResponse response = new CheckReadResponse();
        AnnouncementData.checkRead(request.id, request.checked, response);
        return Response.ok().entity(response).build();
    }

    public static class CheckReadRequest {

        /**
         * A constructor without parameters prevents serialization error, "No default constructor
         * found"
         */
        public CheckReadRequest() {
            this.id = 0;
            this.checked = false;
        }

        @Schema(description = "id")
        public int id;

        @Schema(description = "checked")
        public boolean checked;
    }

    public static class CheckReadResponse {

        @Schema(description = "ok")
        public boolean ok = false;

        @Schema(description = "err")
        public String err = "";
    }
}
