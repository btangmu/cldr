package org.unicode.cldr.web;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;

import org.json.JSONArray;
import org.json.JSONException;
import org.unicode.cldr.util.CLDRLocale;
import org.unicode.cldr.util.XMLSource;
import org.unicode.cldr.web.SurveyAjax.JSONWriter;

public class SurveyBulkClosePosts {
    private enum Cell {
        WINNING_OPEN_REQUEST("Winning open request posts"),
        ;

        private String title;

        private Cell(String title) {
            this.title = title;
        }
    }

    private static final String forumTable = DBUtils.Table.FORUM_POSTS.toString();
    // private static final String userTable = UserRegistry.CLDR_USERS;

    // private static final int typeDiscuss = SurveyForum.PostType.DISCUSS.toInt();
    private static final int typeRequest = SurveyForum.PostType.REQUEST.toInt();

    private Connection conn = null;

    private SurveyMain sm;

    private ArrayList<Integer> idListToClose = new ArrayList<>();

    public SurveyBulkClosePosts(SurveyMain sm) {
        this.sm = sm;
    }

    public void getJson(JSONWriter r) throws JSONException, SQLException {
        JSONArray headers = new JSONArray();
        for (Cell cell : Cell.values()) {
            headers.put(cell.title);
        }
        r.put("headers", headers);

        JSONArray rows = new JSONArray();
        for (int i = 0; i <= 1; i++) {
            JSONArray cells = new JSONArray();
            for (Cell cell : Cell.values()) {
                String s = getCell(i, cell);
                cells.put(s);
            }
            rows.put(cells);
        }
        r.put("rows", rows);
    }

    private String getCell(int i, Cell cell) throws SQLException {
        if (i == 0 && cell == Cell.WINNING_OPEN_REQUEST) {
            getIdListToClose();
            return idListToClose.toString();
        }
        return "?";
    }

    private void getIdListToClose() throws SQLException {
        ResultSet rs = null;
        try {
            conn = DBUtils.getInstance().getDBConnection();
            PreparedStatement ps = prepareOpenRequestsDetailQuery();
            rs = ps.executeQuery();
            while (rs.next()) {
                Integer id = rs.getInt(1);
                String loc = rs.getString(2);
                Integer xpath = rs.getInt(3);
                String value = rs.getString(4);
                if (matchesWinning(loc, xpath, value)) {
                    idListToClose.add(id);
                }
            }
        } catch (SQLException e) {
            SurveyLog.logException(e, "getIdListToClose");
        } finally {
            DBUtils.close(conn);
            conn = null;
            if (rs != null) {
                rs.close();
            }
        }
    }

    private PreparedStatement prepareOpenRequestsDetailQuery() throws SQLException {
        String sql = "SELECT id,loc,xpath,value"
            + " FROM " + forumTable
            + " WHERE is_open=true"
            + " AND type=?";
        PreparedStatement ps = DBUtils.prepareForwardReadOnly(conn, sql);
        ps.setInt(1, typeRequest);
        return ps;
    }

    private boolean matchesWinning(String loc, Integer xpath, String value) {
        CLDRLocale locale = CLDRLocale.getInstance(loc);
        XMLSource diskData = sm.getDiskFactory().makeSource(locale.getBaseName()).freeze();
        String xpathString = sm.xpt.getById(xpath);
        String curValue = diskData.getValueAtDPath(xpathString);
        return curValue != null && curValue.equals(value);
    }
}
