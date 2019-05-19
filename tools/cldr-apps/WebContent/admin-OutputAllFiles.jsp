<%@page import="com.ibm.icu.dev.util.ElapsedTimer"%>
<%@page import="org.unicode.cldr.web.*"%>
<%@page import="org.unicode.cldr.util.*,java.util.*"%>
<%@page import="java.io.*"%>
<%@page import="java.sql.*"%>
<%@page import="org.unicode.cldr.test.*"%>
<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>Update All Files</title>
</head>
<body>

<%
	String vap = request.getParameter("vap");
	if (vap ==null || !vap.equals(SurveyMain.vap)) {
		out.write("Not authorized.");
		return;
	}

	long start = System.currentTimeMillis();
	ElapsedTimer overallTimer = new ElapsedTimer("overall update started " + new java.util.Date());
	int numupd = 0;
	SurveyMain sm = CookieSession.sm;

	// top line is like "Have OFM=org.unicode.cldr.web.OutputFileManager@4d150a19"
	OutputFileManager ofm = sm.getOutputFileManager();
	out.write("Have OFM=" + ofm.toString() + "\n");
	out.write("<ol>\n");

	Set<CLDRLocale> sortSet = new TreeSet<CLDRLocale>();
	sortSet.addAll(SurveyMain.getLocalesSet());
	Connection conn = null;
	synchronized(OutputFileManager.class) {
	try {
		conn = sm.dbUtils.getDBConnection();
		for (CLDRLocale loc : sortSet) {
	        Timestamp locTime=ofm.getLocaleTime(conn, loc);
	        out.write("<li>" + loc.getDisplayName() + " - " + locTime.toLocaleString() + "<br/>\n");
			for(OutputFileManager.Kind kind : OutputFileManager.Kind.values()) {
				boolean nu= ofm.fileNeedsUpdate(locTime,loc,kind.name());
				String background = nu?"#ff9999":"green";
				String weight = nu?"regular":"bold";
				String color = nu?"silver":"black";
				out.write("<span style=' background-color: " + background + "; font-weight: " + weight + "; color: " + color + ";'>");
				out.write(kind.toString());
				if(nu&&(kind==OutputFileManager.Kind.vxml || kind==OutputFileManager.Kind.pxml)) {
					System.err.println("Writing " + loc.getDisplayName() + ":"+kind);
					ElapsedTimer et = new ElapsedTimer("to write " + loc +":"+kind);
					File f = ofm.getOutputFile(conn, loc, kind.name());
					out.print(" x=" + (f != null && f.exists()));
					numupd++;
					System.err.println(et + " - upd " + numupd+"/"+(sortSet.size()+2));
				}
				out.write("</span>  &nbsp;");
			}
			out.write("</li>\n");
		}
	} finally {
		DBUtils.close(conn);
	}
	}
	out.write("</ol>\n");
	out.write("<hr>\n");
	out.write("Total upd: " + numupd + "/" + (sortSet.size() + 2) + "\n");
	out.write("Total time: " + overallTimer + " : " + ((System.currentTimeMillis()-start)/(1000.0*60)) + "min\n");

	System.err.println(overallTimer +  " - updated " + numupd+"/"+(sortSet.size()+2) + " in " + (System.currentTimeMillis()-start)/(1000.0*60) + " min");
%>
</body>
</html>
