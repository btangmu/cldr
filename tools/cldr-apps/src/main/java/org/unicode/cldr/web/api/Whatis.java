package org.unicode.cldr.web.api;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.unicode.cldr.util.CLDRFile;
import org.unicode.cldr.util.CLDRLocale;
import org.unicode.cldr.util.StandardCodes;
import org.unicode.cldr.web.CookieSession;
import org.unicode.cldr.web.SurveyMain;

@Path("/whatis")
public class Whatis {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
        summary = "Look up a code",
        description = "Searches for codes containing the given string, with the given base locale")
    @APIResponses(
        value = {
            @APIResponse(
                responseCode = "200",
                description = "Look up a code",
                content = @Content(mediaType = "application/json",
                    schema = @Schema(type = SchemaType.OBJECT,
                        example = "{\n"
                            + "  \"results\": \"...\"\n"
                            + "}\n"
                            + ""))) })
    public Response getWhatis(
        @Parameter(required = true, example = "jgo", schema = @Schema(type = SchemaType.STRING)) @QueryParam("q") String q,
        @Parameter(required = true, example = "en_US", schema = @Schema(type = SchemaType.STRING)) @QueryParam("loc") String loc) {

        Map<String, String> r = new TreeMap<>();
        q = q.trim();
        if (q.isEmpty()) {
            r.put("err", "empty query");
        } else if (q.startsWith("\\u") || q.startsWith("=")) {
            doSearchUEq(r, q, loc);
        } else {
            doOtherSearch(r, q, loc);
        }
        return Response.ok(r).build();
    }

    private void doSearchUEq(Map<String, String> r, String q, String loc) {
        String q2 = com.ibm.icu.impl.Utility.unescape(q);
        if (q2.startsWith("=")) {
            q2 = q2.substring(1);
        }

        //// <h3>XPATH search String match '<%= q %>' ('<%= q2 %>') </h3>

        SurveyMain sm = CookieSession.sm;
        int xpc = 0;
        for (CLDRLocale loc2 : SurveyMain.getLocalesSet()) {
            boolean hdr = false;
            CLDRFile f = null;
            try {
                f = sm.getSTFactory().make(loc2.getBaseName(), false);
            } catch (Throwable t) {
                /*
                <pre>
                */
                t.toString();
                /*
                 loading
                 */
                loc2.getDisplayName();
                /*
                  - <%= loc2 %>
                */
                t.printStackTrace();
                /*
                </pre>
                */
            }
            if (f == null) {
                continue;
            }
            for (String xp : f) {
                String str = f.getStringValue(xp);
                xpc++;
                if (str.contains(q2)) {
                    if (!hdr) {
                        /*
                        <h4><%= loc2 %> - <%=
                        */
                        loc2.getDisplayName();
                        /* </h4>
                        <ul>
                        */
                        hdr = true;
                    }
                    /*
                    <li><tt class='codebox'><%= xp %></tt> = <span class='value'><%= str %></span></li>
                    */
                }
                if (hdr) {
                    /*
                    </ul>
                    */
                }
            }
        }
        /*
        <hr><i>end of results - checked <%= xpc %> xpaths in <%= sm.getLocalesSet().size() %> locales - <%= et %></i>
        */
    }

    private void doOtherSearch(Map<String, String> r, String q, String loc) {
        StandardCodes sc = StandardCodes.make();
        /*
        <h2>Results for <tt><%= q %></tt></h2>
        */
        q = q.toLowerCase();
        /*
        <hr>
        <h3>Code or Data Exact Matches</h3>
        */
        for (String type : sc.getAvailableTypes()) {
            for (String code : sc.getAvailableCodes(type)) {
                List<String> v = sc.getFullData(type, code);
                if (v == null || v.isEmpty()) {
                    continue;
                }
                if (code.toLowerCase().equals(q)) {
                    /*
                    <b><%= type %> : <span class='winner'><%= code %></span></b> =
                    <blockquote>
                    */
                    if (v.isEmpty()) {
                        continue;
                    }
                    for (String s : v) {
                        /*
                        <%= s %
                        ><br/>
                        */
                    }
                    /*
                    </blockquote>
                    */
                } else {
                    if (v == null || v.isEmpty()) {
                        continue;
                    }
                    for (String s : v) {
                        if (s != null && s.toLowerCase().equals(q)) {
                            /*
                            <b><%= type %> : <span class='winner'><%= code %></span></b> =
                                   <blockquote>
                            */
                            for (String s2 : v) {
                                if (s2.toLowerCase().equals(q)) {
                                    /*
                                    <span class='winner'>
                                    */
                                } else {
                                    /*
                                     <span>
                                     */
                                }
                                /*
                                <%= s %></span><br/>
                                */
                                /*
                                </blockquote>
                                */
                                continue;
                            }
                        }
                    }
                }
            }
            /*
            <hr>
            <h3>Full Text Matches</h3>
            */
            for (String sctype : sc.getAvailableTypes()) {
                for (String code : sc.getAvailableCodes(sctype)) {
                    List<String> v = sc.getFullData(sctype, code);
                    StringBuilder allMatch = new StringBuilder();
                    if (v != null && !v.isEmpty()) {
                        for (String s : v) {
                            allMatch.append(s).append("\n");
                        }
                    }
                    if (!code.toLowerCase().equals(q) &&
                        (code.toLowerCase().contains(q) || allMatch.toString().toLowerCase().contains(q))) {
                        /*
                        <b><%= sctype %> : <span class='winner'><%= code %></span></b> =
                        <blockquote>
                        */
                        if (v != null && !v.isEmpty()) {
                            for (String s : v) {
                                /*
                                <%= s %><br/>
                                */
                            }
                        }
                        /*
                        </blockquote>
                        */
                    }
                }
            }
        }
        /*
        <hr><i><%= et %></i>
        */
    }
}
