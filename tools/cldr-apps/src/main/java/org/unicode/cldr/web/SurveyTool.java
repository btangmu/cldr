package org.unicode.cldr.web;

import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONException;

public class SurveyTool extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    public final void init(final ServletConfig config) throws ServletException {
        System.out.println("\n🍓🍓🍓 SurveyTool.init() 🍓🍓🍓\n");
        try {
             super.init(config);
        } catch (Throwable t) {
            System.err.println("SurveyTool.init() caught: " + t.toString());
            return;
        }
    }

    @Override
    public void service(ServletRequest request, ServletResponse response) throws ServletException, IOException {
        serveSinglePageApp((HttpServletRequest) request, (HttpServletResponse) response);
    }

    private void serveSinglePageApp(HttpServletRequest request, HttpServletResponse response) throws IOException {
        request.setAttribute("WebContext", new WebContext(request, response));
        PrintWriter out = response.getWriter();
        out.write("<!DOCTYPE html>\n<html>\n<head>\n");
        out.write("<meta http-equiv='Content-Type' content='text/html; charset=UTF-8'>\n");
        out.write("<title>CLDR Survey Tool</title>\n");
        out.write("<meta name='robots' content='noindex,nofollow'>\n");
        out.write("<meta name='gigabot' content='noindex'>\n");
        includeCss(request, out);
        try {
            SurveyAjax.includeJavaScript(request, out);
        } catch (JSONException e) {
            SurveyLog.logException(e, "SurveyTool.serveSinglePageApp calling SurveyAjax.includeJavaScript");
        }
        SurveyMain sm = SurveyMain.getInstance(request);
        if (sm == null || !SurveyMain.isSetup) {
            out.write("<script>window.setTimeout(function(){window.location.reload(true);},1000);</script>");
        } else if (SurveyMain.isBusted == null) {
            out.write("<script>\n");
            out.write("  survURL = '" + request.getContextPath() + "/survey" + "';\n");
            out.write("</script>\n");
        }
        out.write("</head>\n<body data-spy='scroll' data-target='#itemInfo'>\n");
        if (SurveyMain.isBusted != null) {
            out.write("<p class='ferrorbox'>Survey Tool is offline</p>\n");
        } else if (sm == null || !SurveyMain.isSetup) {
            out.write("<p class='ferrorbox'>Survey Tool is starting up...</p>\n");
        } else {
            out.write("<div id='main'></div>\n");
        }
        out.write("</body>\n</html>\n");
    }

    private void includeCss(HttpServletRequest request, PrintWriter out) {
        String contextPath = request.getContextPath();
        out.write("<link rel='stylesheet' type='text/css' href='" + contextPath + "/surveytool.css' />\n");
        out.write("<link rel='stylesheet' type='text/css' href='" + contextPath + "/css/CldrStForum.css' />\n");
        out.write("<link rel='stylesheet' type='text/css' href='" + contextPath + "/css/redesign.css' />\n");
        out.write("<link rel='stylesheet' type='text/css' href='//ajax.googleapis.com/ajax/libs/dojo/1.14.1/dijit/themes/claro/claro.css' />\n");
    }
}
