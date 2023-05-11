package org.unicode.cldr.web;

import java.util.List;
import org.unicode.cldr.util.LocaleSet;
import org.unicode.cldr.web.api.Announcements;

public class AnnouncementData {

    public static void get(
            UserRegistry.User user, List<Announcements.Announcement> announcementList) {
        String body1 =
                "<p>This is a test including some html.<p>Paragraph.<p><i>Italic.</i> <b>Bold.</b> <a href='https://unicode.org'>Link to unicode.org</a>";
        String body2 = "This is a test \uD83D\uDC40 and it's generated on the back end";
        announcementList.add(
                new Announcements.Announcement(
                        123, "backend@example.com", "2023-01-17 12:30:03.0", "Wow!", body1, false));
        announcementList.add(
                new Announcements.Announcement(
                        456,
                        "server@unicode.org",
                        "2022-12-31 01:22:22.0",
                        "This is really so important",
                        body2,
                        true));
        LocaleSet intLoc = user.getInterestLocales();
        LocaleSet authLoc = user.getAuthorizedLocaleSet();
        System.out.println(
                "AnnouncementData.get not implemented yet; intLoc = "
                        + intLoc
                        + " authLoc = "
                        + authLoc);
    }

    public static void submit(
            Announcements.AnnouncementSubmissionRequest request,
            Announcements.AnnouncementSubmissionResponse response) {
        System.out.println("submit got: " + request.subject);
        response.ok = false;
        response.err = "End of the world: submit not implemented yet";
    }

    public static void checkRead(
            int id, boolean checked, Announcements.CheckReadResponse response) {
        System.out.println("checkRead got: id=" + id + " checked=" + checked);
        response.ok = false;
        response.err = "End of the world: checkRead not implemented yet";
    }
}
