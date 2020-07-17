package org.unicode.cldr.web;

public class SurveyForumParticipation {
    private String org;

    private final String tableId = "participationTable";
    private final String fileName = "participation.csv";
    private final String onclick = "cldrStCsvFromTable.downloadCsv("
        + "\"" + tableId + "\""
        + ", "
        + "\"" + fileName + "\""
        + ")";

    private String[] headers = {
        "Locale",
        "Abstained votes by my organization in expected coverage level",
        "Missing/Provisional & we haven’t voted",
        "Total request + discussions initiated in this release",
        "Error counts in this locale",
        "Forum: Requests with status Open",
        "Forum: Discussions with status Open",
        "Forum: Requests and Discussions initiated by my organization",
        "Forum: Needing action (Requests and Discussions my organization has not responded to)"
    };

    public SurveyForumParticipation(String org) {
        this.org = org;
    }

    public String getHtml() {
        String html = "<p>Organization: " + org + "</p>\n";
        html += "<p><a onclick='" + onclick + "'>Download CSV</a></p>\n";
        html += makeHtmlTable();
        return html;
    }

    private String makeHtmlTable() {
        String html = "<table id='" + tableId + "' border='1'>\n";
        html += "<tr>\n";
        for (String header : headers) {
            html += "<th>" + header + "</th>\n";
        }
        html += "</tr>\n";
        for (int row = 0; row < 10; row++) {
            html += "<tr>\n";
            for (int col = 0; col < headers.length; col++) {
                html += "<td>" + row + ":" + col + "</td>\n";
            }
            html += "</tr>\n";
        }
        html += "</table>\n";
        return html;
    }
}
