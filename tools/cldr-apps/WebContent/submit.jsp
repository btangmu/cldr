<%@page import="org.unicode.cldr.icu.LDMLConstants"%>
<%@page import="org.unicode.cldr.util.PathHeader.SurveyToolStatus"%>
<%@page
	import="org.unicode.cldr.web.CLDRProgressIndicator.CLDRProgressTask"%>
<%@page import="com.ibm.icu.util.ULocale"%>
<%@page import="org.xml.sax.SAXParseException"%>
<%@page import="org.unicode.cldr.util.CLDRFile.DraftStatus"%>
<%@page import="org.unicode.cldr.util.*"%>
<%@page import="org.unicode.cldr.util.CLDRInfo.CandidateInfo"%>
<%@page import="org.unicode.cldr.util.CLDRInfo.UserInfo"%>
<%@page import="org.unicode.cldr.test.*"%>
<%@page import="org.unicode.cldr.web.*"%>
<%@page import="org.unicode.cldr.util.CLDRFile"%>
<%@page import="org.unicode.cldr.util.SimpleXMLSource"%>
<%@page import="org.unicode.cldr.util.XMLSource"%>
<%@page import="org.unicode.cldr.util.CoverageInfo" %>
<%@page import="org.unicode.cldr.util.CoverageInfo" %>
<%@page import="java.io.*"%><%@page
	import="java.util.*,org.apache.commons.fileupload.*,org.apache.commons.fileupload.servlet.*,org.apache.commons.io.FileCleaningTracker,org.apache.commons.fileupload.util.*,org.apache.commons.fileupload.disk.*,java.io.File"%>
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%
SurveyAjax.handleSubmit(request, response, out);
%>
