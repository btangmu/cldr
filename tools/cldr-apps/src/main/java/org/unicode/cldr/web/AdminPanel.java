package org.unicode.cldr.web;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.unicode.cldr.util.CLDRConfig;
import org.unicode.cldr.util.CLDRConfigImpl;
import org.unicode.cldr.web.SurveyAjax.JSONWriter;

public class AdminPanel {
    public void getJson(JSONWriter r, HttpServletRequest request) throws JSONException, IOException {
        String action = request.getParameter("do");
        if (action == null || action.isEmpty()) {
            return;
        }
        if (action.equals("users")) {
            JSONObject users = new JSONObject();
            for (CookieSession cs : CookieSession.getAllSet()) {
                JSONObject sess = new JSONObject();
                if (cs.user != null) {
                    sess.put("user", SurveyAjax.JSONWriter.wrap(cs.user));
                }
                sess.put("id", cs.id);
                sess.put("ip", cs.ip);
                sess.put("lastBrowserCallMillisSinceEpoch", SurveyMain.timeDiff(cs.getLastBrowserCallMillisSinceEpoch()));
                sess.put("lastActionMillisSinceEpoch", SurveyMain.timeDiff(cs.getLastActionMillisSinceEpoch()));
                sess.put("millisTillKick", cs.millisTillKick());
                users.put(cs.id, sess);
            }
            r.put("users", users);
        } else if (action.equals("unlink")) {
            String s = request.getParameter("s");
            CookieSession cs = CookieSession.retrieveWithoutTouch(s);
            if (cs != null) {
                JSONObject sess = new JSONObject();
                if (cs.user != null) {
                    sess.put("user", SurveyAjax.JSONWriter.wrap(cs.user));
                }
                sess.put("id", cs.id);
                sess.put("ip", cs.ip);
                sess.put("lastBrowserCallMillisSinceEpoch", SurveyMain.timeDiff(cs.getLastBrowserCallMillisSinceEpoch()));
                sess.put("lastActionMillisSinceEpoch", SurveyMain.timeDiff(cs.getLastActionMillisSinceEpoch()));
                sess.put("millisTillKick", cs.millisTillKick());
                r.put("kick", s);
                r.put("removing", sess);
                cs.remove();
            } else {
                r.put("kick", s);
                r.put("removing", null);
            }
        } else if (action.equals("threads")) {
            JSONObject threads = new JSONObject();
            ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
            long deadlockedThreads[] = threadBean.findDeadlockedThreads();
            if (deadlockedThreads != null) {
                JSONArray dead = new JSONArray();
                ThreadInfo deadThreadInfo[] = threadBean.getThreadInfo(
                    deadlockedThreads, true, true);
                for (ThreadInfo deadThread : deadThreadInfo) {
                    dead.put(new JSONObject()
                        .put("name", deadThread.getThreadName())
                        .put("id", deadThread.getThreadId())
                        .put("text", deadThread.toString()));
                }
                threads.put("dead", dead);
            }
            Map<Thread, StackTraceElement[]> s = Thread.getAllStackTraces();
            JSONObject threadList = new JSONObject();
            for (Map.Entry<Thread, StackTraceElement[]> e : s.entrySet()) {
                Thread t = e.getKey();
                JSONObject thread = new JSONObject()
                    .put("state", t.getState())
                    .put("name", t.getName())
                    .put("stack", new JSONArray(e.getValue()));
                threadList.put(Long.toString(t.getId()), thread);
            }
            threads.put("all", threadList);
            r.put("threads", threads);
        } else if (action.equals("exceptions")) {
            JSONObject exceptions = new JSONObject();
            ChunkyReader cr = SurveyLog.getChunkyReader();
            exceptions.put("lastTime", cr.getLastTime());
            ChunkyReader.Entry e = null;
            if (request.getParameter("before") != null) {
                Long before = Long.parseLong(request.getParameter("before"));
                e = cr.getEntryBelow(before);
            } else {
                e = cr.getLastEntry();
            }
            if (e != null) {
                exceptions.put("entry", e);
            }
            r.put("exceptions", exceptions);
        } else if (action.equals("settings")) {
            CLDRConfigImpl cci = (CLDRConfigImpl) (CLDRConfig.getInstance());
            JSONObject all = new JSONObject().put("all", cci.toJSONObject());
            r.put("settings", all);
        } else if (action.equals("settings_set")) {
            JSONObject settings = new JSONObject();
            try {
                String setting = request.getParameter("setting");
                StringBuilder sb = new StringBuilder();
                java.io.Reader reader = request.getReader();
                int ch;
                while ((ch = reader.read()) > -1) {
                    sb.append((char) ch);
                }
                CLDRConfig cci = (CLDRConfig.getInstance());
                cci.setProperty(setting, sb.toString());
                settings.put("ok", true);
                settings.put(setting, cci.getProperty(setting));
            } catch (Throwable t) {
                SurveyLog.logException(t, "Tring to set setting ");
                settings.put("err", t.toString());
            }
            r.put("settings_set", settings);
        } else if (action.equals("rawload")) {
            if (CLDRConfig.getInstance().getEnvironment() != CLDRConfig.Environment.SMOKETEST) {
                r.put("err", "Only available in SMOKETEST context.");
            } else {
                String users = request.getParameter("users");
                String pxml = request.getParameter("pxml");
                if (users != null && pxml != null && !users.isEmpty() && !pxml.isEmpty()) {
                    // TODO: see AdminPanel.jsp
                    // <h3>Starting import org.unicode.cldr.web.SurveyAjax.JSONWriter;
                    // import from <%= users %></h3>
                    // int usersRead = CookieSession.sm.reg.readUserFile(CookieSession.sm, new java.io.File(users));
                    // ...
                }
                r.put("err", "rawload not yet implemented without jsp");
            }
        } else {
            r.put("err", "Unknown action: " + action);
        }
    }
}
