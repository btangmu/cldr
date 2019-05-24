/*
 ******************************************************************************
 * Copyright (C) 2004-2012, International Business Machines Corporation and   *
 * others. All Rights Reserved.                                               *
 ******************************************************************************
 */

package org.unicode.cldr.web;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.tmatesoft.svn.core.SVNCommitInfo;
import org.tmatesoft.svn.core.SVNDepth;
import org.tmatesoft.svn.core.SVNErrorCode;
import org.tmatesoft.svn.core.SVNErrorMessage;
import org.tmatesoft.svn.core.SVNException;
import org.tmatesoft.svn.core.SVNNodeKind;
import org.tmatesoft.svn.core.SVNURL;
import org.tmatesoft.svn.core.wc.SVNClientManager;
import org.tmatesoft.svn.core.wc.SVNCommitClient;
import org.tmatesoft.svn.core.wc.SVNInfo;
import org.tmatesoft.svn.core.wc.SVNRevision;
import org.tmatesoft.svn.core.wc.SVNStatus;
import org.tmatesoft.svn.core.wc.SVNStatusClient;
import org.tmatesoft.svn.core.wc.SVNStatusType;
import org.tmatesoft.svn.core.wc.SVNUpdateClient;
import org.tmatesoft.svn.core.wc.SVNWCClient;
import org.unicode.cldr.util.CLDRFile;
import org.unicode.cldr.util.CLDRLocale;
import org.unicode.cldr.util.CLDRPaths;
import org.unicode.cldr.util.CldrUtility;
import org.unicode.cldr.util.Pair;
import org.unicode.cldr.web.CLDRProgressIndicator.CLDRProgressTask;

import com.google.common.collect.ImmutableMap;
import com.ibm.icu.dev.util.ElapsedTimer;

public class OutputFileManager {

    private static boolean DEBUG = false;
    private static final String XML_SUFFIX = ".xml";
    private SurveyMain sm;

    public OutputFileManager(SurveyMain surveyMain) {
        this.sm = surveyMain;

        File vxmlDir = null;
        SVNInfo i = null;
        try {
            vxmlDir = sm.makeDataDir(Kind.vxml.name());
            i = svnInfo(vxmlDir);
            if (i.getKind() != SVNNodeKind.DIR) {
                throw new IllegalArgumentException("Unknown node kind :  " + i.getKind());
            }
        } catch (Throwable t) {
            tryCommit = false;
            String whyNot = tryCommitWhyNot = "SVN disabled - because: " + t.toString() + " on "
                + ((vxmlDir == null) ? "(null vxml directory)" : vxmlDir.getAbsolutePath());

            System.err.println(whyNot);

            // svnShutdown();
        }
        if (tryCommit) {
            System.err.println("SVN commits active in " + vxmlDir.getAbsolutePath() + " - r"
                + i.getCommittedRevision().getNumber() + " " + i.getCommittedDate());
        }
    }

    public enum Kind {
        vxml("Vetted XML. This is the 'final' output from the SurveyTool."),

        xml("Input XML. This is the on-disk data as read by the SurveyTool."),

        rxml("Fully resolved, vetted, XML. This includes all parent data. Huge and expensive."),

        fxml("'Final' data. Obsolete."),

        pxml("Proposed XML. This data contains all possible user proposals and can be used to reconstruct the voting situation.");

        Kind(String desc) {
            this.desc = desc;
        }

        public String getDesc() {
            return desc;
        }

        private final String desc;
    };

    /**
     * @param kind
     * @return true if this kind is cacheable
     */
    private static boolean isCacheableKind(String kind) {
        try {
            Kind.valueOf(kind);
            return true;
        } catch (IllegalArgumentException iae) {
            return false;
        }
    }

    public static final String XML_PREFIX = "/xml/main";
    public static final String ZXML_PREFIX = "/zxml/main";
    public static final String ZVXML_PREFIX = "/zvxml/main";
    public static final String VXML_PREFIX = "/vxml/main";
    public static final String PXML_PREFIX = "/pxml/main";
    public static final String TXML_PREFIX = "/txml/main";
    public static final String RXML_PREFIX = "/rxml/main";
    public static final String FXML_PREFIX = "/fxml/main";
    public static final String FEED_PREFIX = "/feed";

    public boolean tryCommit = true;
    public String tryCommitWhyNot = null;

    /**
     * Output all files (VXML, etc.) and verify their consistency
     *
     * @param request the HttpServletRequest, used for "vap"
     * @param out the Writer, to receive HTML output
     *
     * Invoked by pasting a url like this into a browser:
     *     http://localhost:8080/cldr-apps/admin-OutputAllFiles.jsp?vap=...
     *
     * This function was created using code moved here from admin-OutputAllFiles.jsp.
     * Reference: CLDR-12016 and CLDR-11877
     */
    public static void outputAndVerifyAllFiles(HttpServletRequest request, Writer out) {
        String vap = request.getParameter("vap");
        try {
            if (vap == null || !vap.equals(SurveyMain.vap)) {
                out.write("Not authorized.");
                return;
            }
            synchronized (OutputFileManager.class) {
                SurveyMain sm = CookieSession.sm;
                OutputFileManager ofm = sm.getOutputFileManager();
                // top line is like "Have OFM=org.unicode.cldr.web.OutputFileManager@4d150a19" -- is this still needed?
                out.write("Have OFM=" + ofm.toString() + "\n");
                ofm.outputAllFiles(out);
                ofm.verifyAllFiles(out);
            }
        } catch (Exception e) {
            System.err.println("Exception in outputAndVerifyAllFiles: " + e);
            e.printStackTrace();
        }
    }

    /**
     * Verify all VXML files
     *
     * @param out the Writer, to receive HTML output
     *
     * The following need to be verified on the server when generating vxml:
     * • The same file must not occur in both the common/X and seed/X directories, for any X=main|annotations
     * • If a parent locale (except for root) must occur in the same directory as the child locale
     * • Every file in trunk (common|seed/X) must have a corresponding vxml file
     * • Every file in vxml (common|seed/X) must have a corresponding trunk file
     * This should fail with clear warning to the user that there is a major problem.
     * Reference: CLDR-12016
     * @throws IOException
     *
     * vetdata
     * └── vxml
     *     ├── common
     *     │   ├── annotations
     *     │   └── main
     *     └── seed
     *         ├── annotations
     *         └── main
     */
    private void verifyAllFiles(Writer out) throws IOException {
        File vxmlDir = sm.makeDataDir(Kind.vxml.name());

        /*
         * CLDRConfig.COMMON_DIR, etc., are private; what's a better way to get them here without hard-coding?
         */
        String[] commonAndSeed = {"common" /* CLDRConfig.COMMON_DIR */, "seed" /* CLDRConfig.SEED_DIR */};
        String[] mainAndAnnotations = {"main" /* CLDRConfig.MAIN_DIR */, "annotations" /* CLDRConfig.ANNOTATIONS_DIR */};

        int failureCount = 0;

        /*
         * The same file must not occur in both the common/X and seed/X directories, for any X=main|annotations
         */
        if (!verifyNoDuplicatesInCommonAndSeed(out, vxmlDir, commonAndSeed, mainAndAnnotations)) {
            ++failureCount;
        }
        /*
         * A parent locale (except for root) must occur in the same directory as the child locale
         */
        if (!verifyParentChildSameDirectory(out, vxmlDir, commonAndSeed, mainAndAnnotations)) {
            ++failureCount;
        }
        /*
         * Every file in trunk (common|seed/X) must have a corresponding vxml file
         * Every file in vxml (common|seed/X) must have a corresponding trunk file
         */
        if (!verifyVxmlAndTrunkFilesCorrespond(out, vxmlDir, commonAndSeed, mainAndAnnotations)) {
            ++failureCount;
        }

        if (failureCount == 0) {
            out.write("<h1>✅ VXML verification succeeded</h1>\nOK<br>");
        } else {
            out.write("<h1>❌ VXML verification failed!</h1>\nFailure count = " + failureCount + "<br>");
        }
    }

    /**
     * Verify that the same file does not occur in both the common/X and seed/X directories, for any X=main|annotations
     *
     * @param out
     * @return true if verification succeeded, false for failure
     * @throws IOException
     */
    private boolean verifyNoDuplicatesInCommonAndSeed(Writer out, File vxmlDir, String[] commonAndSeed, String[] mainAndAnnotations)
            throws IOException {

        for (String m: mainAndAnnotations) {
            String commonDirName = vxmlDir + "/" + commonAndSeed[0] + "/" + m;
            String seedDirName = vxmlDir + "/" + commonAndSeed[1] + "/" + m;
            File dirFile = new File(commonDirName);
            if (dirFile.exists()) {
                for (String commonName : dirFile.list()) {
                    String commonPathName = commonDirName + "/" + commonName;
                    String seedPathName = seedDirName + "/" + commonName;
                    File fSeed = new File(seedPathName);
                    if (fSeed.exists()) {
                        out.write("<h2>Verification failure, found duplicates</h2>\n"
                            + commonPathName + "<br>\n"
                            + seedPathName + "<br>\n");
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Verify that a file for parent locale does occur in the same directory as the file for the child locale
     *
     * Examples:
     *   if we have "aa_NA.xml" we should have "aa.xml" in the same folder
     *   if we have "ff_Adlm_BF.xml" we should have "ff_Adlm.xml" in the same folder
     * Note handling of two underscores in "ff_Adlm_BF.xml"
     *
     * @param out
     * @return true if verification succeeded, false for failure
     * @throws IOException
     */
    private boolean verifyParentChildSameDirectory(Writer out, File vxmlDir, String[] commonAndSeed, String[] mainAndAnnotations)
            throws IOException {

        for (String c: commonAndSeed) {
            for (String m: mainAndAnnotations) {
                String dirName = vxmlDir + "/" + c + "/" + m;
                File dirFile = new File(dirName);
                if (dirFile.exists()) {
                    for (String childName : dirFile.list()) {
                        String childPathName = dirName + "/" + childName;
                        /*
                         * Get the parent from the child. Change "aa_NA.xml" to "aa.xml";
                         * "ff_Adlm_BF.xml" to "ff_Adlm.xml"; "sr_Cyrl_BA.xml" to "sr_Cyrl.xml" (not "sr.xml")
                         */
                        String localeName = childName.replaceFirst("\\.xml$", "");
                        CLDRLocale childLoc = CLDRLocale.getInstance(localeName);
                        if (childLoc == null) {
                            out.write("<h2>Verification failure, locale not recognized from file name</h2>\n"
                                + childPathName + "<br>\n");
                            return false;
                        }
                        CLDRLocale parLoc = childLoc.getParent();
                        if (parLoc != null) {
                            // String parentName = fileName.replaceFirst("_[a-zA-Z]+\\.xml$", "\\.xml");
                            String parentName = parLoc.toString() + ".xml";
                            if (!childName.equals(parentName) && !"root.xml".equals(parentName)) {
                                String parentPathName = dirName + "/" + parentName;
                                File fParent = new File(parentPathName);
                                if (!fParent.exists()) {
                                    out.write("<h2>Verification failure, child without parent</h2>\n"
                                        + "Child, present: " + childPathName + "<br>\n"
                                        + "Parent, absent: " + parentPathName + "<br>\n");
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * Verify that every file in trunk (common|seed/X) has a corresponding vxml file
     * AND every file in vxml (common|seed/X) has a corresponding trunk file
     *
     * @param out
     * @return true if verification succeeded, false for failure
     * @throws IOException
     */
    private boolean verifyVxmlAndTrunkFilesCorrespond(Writer out, File vxmlDir, String[] commonAndSeed, String[] mainAndAnnotations)
            throws IOException {

        String cldrDir = CLDRPaths.BASE_DIRECTORY;
        ArrayList<String> vxmlFiles = new ArrayList<String>();
        ArrayList<String> cldrFiles = new ArrayList<String>();
        for (String c: commonAndSeed) {
            for (String m: mainAndAnnotations) {
                File vxmlDirFile = new File(vxmlDir + "/" + c + "/" + m);
                File cldrDirFile = new File(cldrDir + "/" + c + "/" + m);
                if (vxmlDirFile.exists()) {
                    for (String name : vxmlDirFile.list()) {
                        vxmlFiles.add(c + "/" + m  + "/" + name);
                    }
                }
                if (cldrDirFile.exists()) {
                    for (String name : cldrDirFile.list()) {
                        cldrFiles.add(c + "/" + m  + "/" + name);
                    }
                }
            }
        }
        Set<String> diff = symmetricDifference(vxmlFiles, cldrFiles);
        if (!diff.isEmpty()) {
            out.write("<h2>Verification failure, vxml and trunk do not correspond</h2>\n");
            out.write("Difference(s):<br>\n");
            for (String name: diff) {
                out.write(name + "<br>\n");
            }
            return false;
        }
        return true;
    }

    /**
     * Return the set of all strings that are in one list but not the other
     *
     * @param list1
     * @param list2
     * @return the Set
     */
    private static Set<String> symmetricDifference(final ArrayList<String> list1, final ArrayList<String> list2) {
        Set<String> diff = new HashSet<String>(list1);
        diff.addAll(list2);
        Set<String> tmp = new HashSet<String>(list1);
        tmp.retainAll(list2);
        diff.removeAll(tmp);
        return diff;
    }

    /**
     * Output all files (VXML, etc.)
     *
     * @param out the Writer, to receive HTML output
     *
     * This function was created using code moved here from admin-OutputAllFiles.jsp.
     * Reference: CLDR-12016 and CLDR-11877
     */
    private void outputAllFiles(Writer out) {
        try {
            long start = System.currentTimeMillis();
            ElapsedTimer overallTimer = new ElapsedTimer("overall update started " + new java.util.Date());
            int numupd = 0;

            out.write("<ol>\n");

            Set<CLDRLocale> sortSet = new TreeSet<CLDRLocale>();
            sortSet.addAll(SurveyMain.getLocalesSet());
            Connection conn = null;
            try {
                conn = sm.dbUtils.getDBConnection();
                for (CLDRLocale loc : sortSet) {
                    Timestamp locTime = this.getLocaleTime(conn, loc);
                    out.write("<li>" + loc.getDisplayName() + " - " + locTime.toLocaleString() + "<br/>\n");
                    for (OutputFileManager.Kind kind : OutputFileManager.Kind.values()) {
                        boolean nu = this.fileNeedsUpdate(locTime, loc, kind.name());
                        String background = nu ? "#ff9999" : "green";
                        String weight = nu ? "regular" : "bold";
                        String color = nu ? "silver" : "black";
                        out.write("\n\n\t<span style=' background-color: " + background + "; font-weight: " + weight + "; color: " + color + ";'>");
                        out.write(kind.toString());
                        if (nu && (kind == OutputFileManager.Kind.vxml || kind == OutputFileManager.Kind.pxml)) {
                            System.err.println("Writing " + loc.getDisplayName() + ":" + kind);
                            ElapsedTimer et = new ElapsedTimer("to write " + loc + ":" + kind);
                            File f = this.getOutputFile(conn, loc, kind.name());
                            out.write(" x=" + (f != null && f.exists()));
                            numupd++;
                            System.err.println(et + " - upd " + numupd + "/" + (sortSet.size() + 2));
                        }
                        out.write("</span>  &nbsp;");
                    }
                    out.write("</li>\n");
                }
            } finally {
                DBUtils.close(conn);
            }
            out.write("</ol>\n");
            out.write("<hr>\n");
            out.write("Total upd: " + numupd + "/" + (sortSet.size() + 2) + "\n");
            out.write("Total time: " + overallTimer + " : " + ((System.currentTimeMillis() - start) / (1000.0 * 60)) + "min\n");

            System.err.println(overallTimer + " - updated " + numupd + "/" + (sortSet.size() + 2) +
                " in " + (System.currentTimeMillis() - start) / (1000.0 * 60) + " min");
        } catch (Exception e) {
            System.err.println("Exception in outputAllFiles: " + e);
        }
    }

    /**
     * Write out the specified file.
     *
     * @param loc
     * @param kind
     * @return
     */
    private File writeOutputFile(CLDRLocale loc, String kind) {
        long st = System.currentTimeMillis();
        CLDRFile file;
        boolean isFlat = false;
        if (kind.equals("vxml")) {
            file = sm.getSTFactory().makeVettedFile(loc);
        } else if (kind.equals("pxml")) {
            file = sm.getSTFactory().makeProposedFile(loc);
        } else {
            if (!isCacheableKind(kind)) {
                throw new InternalError("Can't (yet) cache kind " + kind + " for loc " + loc);
            } else {
                throw new InternalError("Don't know how to make kind " + kind + " for loc " + loc
                    + " - isCacheableKind() out of sync with writeOutputFile()");
            }
        }
        try {
            File outFile = sm.getDataFile(kind, loc);

            doWriteFile(loc, file, kind, isFlat, outFile);
            SurveyLog.debug("Updater: Wrote: " + kind + "/" + loc + " - " + ElapsedTimer.elapsedTime(st));

            if (tryCommit && (kind.equals("vxml") || kind.equals("pxml"))) {
                try {
                    ElapsedTimer et = new ElapsedTimer();
                    svnAdd(outFile);
                    if (true)
                        System.err.println("SVN: added " + outFile.getAbsolutePath() + " t=" + et);
                } catch (SVNException e) {
                    if (e.getMessage().contains("E155007")) {
                        SurveyLog.logException(e, "Trying to add [and giving up on SVN commits!]" + outFile.getAbsolutePath());
                        tryCommitWhyNot = "Trying to add [and giving up on SVN commits!]" + outFile.getAbsolutePath() + " - "
                            + e.toString();
                        tryCommit = false;
                    } else if (e.getMessage().contains("E155015")) {
                        svnRemoveAndResolved(outFile);
                        doWriteFile(loc, file, kind, isFlat, outFile);
                        SurveyLog
                            .debug("Updater: Resolved, Re-Wrote: " + kind + "/" + loc + " - " + ElapsedTimer.elapsedTime(st));
                    } else if (!e.getMessage().contains("E150002")) {
                        SurveyLog.logException(e, "Trying to add " + outFile.getAbsolutePath());
                    }
                }
            }
            return outFile;
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("IO Exception " + e.toString(), e);
        }
    }

    static final Predicate<String> isAnnotations = x -> x.startsWith("//ldml/annotations");

    Map<String, Object> OPTS_SKIP_ANNOTATIONS = ImmutableMap.of(
        "SKIP_PATH", isAnnotations);
    Map<String, Object> OPTS_KEEP_ANNOTATIONS = ImmutableMap.of(
        "SKIP_PATH", isAnnotations.negate(),
        "SKIP_FILE_IF_SKIP_ALL_PATHS", true);

    /**
     * @param loc
     * @param file
     * @param isFlat
     * @param outFile
     * @throws UnsupportedEncodingException
     * @throws FileNotFoundException
     */
    private void doWriteFile(CLDRLocale loc, CLDRFile file, String kind, boolean isFlat, File outFile) throws UnsupportedEncodingException,
        FileNotFoundException {
        try (PrintWriter u8out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outFile), "UTF8"))) {

            if (!isFlat) {
                if (kind.equals("vxml") || kind.equals("rxml")) {
                    file.write(u8out, OPTS_SKIP_ANNOTATIONS);

                    // output annotations, too
                    File parentDir = outFile.getParentFile().getParentFile();
                    File annotationsDir = new File(parentDir, "annotations");
                    annotationsDir.mkdirs();
                    File aFile = new File(annotationsDir, outFile.getName()); // same name, different subdir
//                    System.out.println("Annotation: " + aFile.getAbsolutePath());
                    try (PrintWriter u8outa = new PrintWriter(new OutputStreamWriter(new FileOutputStream(aFile), "UTF8"))) {
                        if (!file.write(u8outa, OPTS_KEEP_ANNOTATIONS)) {
                            aFile.delete();
                        }
                    }
                } else {
                    file.write(u8out);
                }
            } else {
                Set<String> keys = new TreeSet<String>();
                for (String k : file) {
                    keys.add(k);
                }
                u8out.println("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
                u8out.println("<!DOCTYPE properties SYSTEM \"http://java.sun.com/dtd/properties.dtd\">");
                u8out.println("<comment>" + loc + "</comment>");
                u8out.println("<properties>");
                for (String k : keys) {
                    u8out.println(" <entry key=\"" + k.replaceAll("\"", "\\\"") + "\">" + file.getStringValue(k) + "</entry>");
                }
                u8out.println("</properties>");
            }
        }
    }

    /**
     * TODO: delete dead code if there's no plan to resurrect it
     *
     * @param ctx
     */
    public void doRaw(WebContext ctx) {
        ctx.println("raw not supported currently. ");
    }

    public boolean doRawXml(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
        String s = request.getPathInfo();

        if ((s == null)
            || !(s.startsWith(XML_PREFIX) || s.startsWith(ZXML_PREFIX) || s.startsWith(ZVXML_PREFIX)
                || s.startsWith(VXML_PREFIX) || s.startsWith(FXML_PREFIX) || s.startsWith(PXML_PREFIX)
                || s.startsWith(RXML_PREFIX) || s.startsWith(TXML_PREFIX) || s.startsWith(FEED_PREFIX))) {
            return false;
        }

        if (s.startsWith(FEED_PREFIX)) {
            return sm.fora.doFeed(request, response);
        }
        return _doRawXml(request, response);
    }

    public synchronized boolean _doRawXml(HttpServletRequest request, HttpServletResponse response) throws IOException,
        ServletException {
        String s = request.getPathInfo();
        CLDRProgressTask p = sm.openProgress("Raw XML");
        try {

            boolean finalData = false;
            String kind = null;

            if (s.startsWith(VXML_PREFIX)) {
                finalData = true;
                if (s.equals(VXML_PREFIX)) {
                    WebContext ctx = new WebContext(request, response);
                    response.sendRedirect(ctx.schemeHostPort() + ctx.base() + VXML_PREFIX + "/");
                    return true;
                }
                kind = "vxml";
                s = s.substring(VXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else if (s.startsWith(PXML_PREFIX)) {
                finalData = true;
                if (s.equals(PXML_PREFIX)) {
                    return true;
                }
                kind = "pxml";
                s = s.substring(PXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else if (s.startsWith(RXML_PREFIX)) {
                finalData = true;
                if (s.equals(RXML_PREFIX)) {
                    WebContext ctx = new WebContext(request, response);
                    response.sendRedirect(ctx.schemeHostPort() + ctx.base() + RXML_PREFIX + "/");
                    return true;
                }
                kind = "rxml"; // cached
                s = s.substring(RXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else if (s.startsWith(FXML_PREFIX)) {
                finalData = true;

                if (s.equals(FXML_PREFIX)) {
                    WebContext ctx = new WebContext(request, response);
                    response.sendRedirect(ctx.schemeHostPort() + ctx.base() + FXML_PREFIX + "/");
                    return true;
                }
                kind = "fxml"; // cached
                s = s.substring(FXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else if (s.startsWith(TXML_PREFIX)) {
                finalData = true;
                if (s.equals(TXML_PREFIX)) {
                    WebContext ctx = new WebContext(request, response);
                    response.sendRedirect(ctx.schemeHostPort() + ctx.base() + TXML_PREFIX + "/");
                    return true;
                }
                s = s.substring(TXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else if (s.startsWith(ZXML_PREFIX)) {
                finalData = false;
                s = s.substring(ZXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else if (s.startsWith(ZVXML_PREFIX)) {
                finalData = true;
                s = s.substring(ZVXML_PREFIX.length() + 1, s.length()); // "foo.xml"
            } else {
                if (s.equals(XML_PREFIX)) {
                    WebContext ctx = new WebContext(request, response);
                    response.sendRedirect(ctx.schemeHostPort() + ctx.base() + XML_PREFIX + "/");
                    return true;
                }
                kind = "xml";
                s = s.substring(XML_PREFIX.length() + 1, s.length()); // "foo.xml"
            }

            if (s.length() == 0) {
                WebContext ctx = new WebContext(request, response);
                response.setContentType("text/html; charset=utf-8");
                if (finalData) {
                    ctx.println("<title>CLDR Data | All Locales - Vetted Data</title>");
                } else {
                    ctx.println("<title>CLDR Data | All Locales</title>");
                }
                ctx.println("<a href='" + ctx.base() + "'>Return to SurveyTool</a><p>");
                ctx.println("<h4>Locales</h4>");
                ctx.println("<ul>");
                CLDRLocale locales[] = SurveyMain.getLocales();
                int nrInFiles = locales.length;
                for (int i = 0; i < nrInFiles; i++) {
                    CLDRLocale locale = locales[i];
                    String localeName = locale.getBaseName();
                    String fileName = localeName + XML_SUFFIX;
                    ctx.println("<li><a href='" + fileName + "'>" + fileName + "</a> " + locale.getDisplayName(ctx.displayLocale)
                        + "</li>");
                }
                ctx.println("</ul>");
                ctx.println("<hr>");
                ctx.println("<a href='" + ctx.base() + "'>Return to SurveyTool</a><p>");
                ctx.close();
            } else if (!s.endsWith(XML_SUFFIX)) {
                WebContext ctx = new WebContext(request, response);
                response.sendRedirect(ctx.schemeHostPort() + ctx.base() + XML_PREFIX + "/");
            } else {
                boolean found = false;
                CLDRLocale locales[] = SurveyMain.getLocales();
                CLDRLocale foundLocale = null;
                int nrInFiles = locales.length;
                for (int i = 0; (!found) && (i < nrInFiles); i++) {
                    CLDRLocale locale = locales[i];
                    String localeName = locale.getBaseName();
                    String fileName = localeName + XML_SUFFIX;
                    if (s.equals(fileName)) {
                        found = true;
                        foundLocale = locale;
                    }
                }
                if (!found) {
                    throw new InternalError("No such locale: " + s);
                } else {
                    String doKvp = request.getParameter("kvp");
                    boolean isKvp = (doKvp != null && doKvp.length() > 0);

                    if (isKvp) {
                        response.setContentType("text/plain; charset=utf-8");
                    } else {
                        response.setContentType("application/xml; charset=utf-8");
                    }

                    if (kind.equals("vxml")) {
                        sm.getSTFactory().make(foundLocale.getBaseName(), false).write(response.getWriter());
                        return true;
                    } else if (kind.equals("pxml")) {
                        sm.getSTFactory().makeProposedFile(foundLocale).write(response.getWriter());
                        return true;
                    }
                    //
                    // if(kind!=null ) {
                    // try {
                    // File f = getOutputFile(locale,kind);
                    // FileInputStream fis = new FileInputStream(f);
                    // byte buf[] = new byte[2048];
                    // int count=0;
                    // ServletOutputStream out = response.getOutputStream();
                    // while((count=fis.read(buf))>=0) {
                    // out.write(buf, 0, count);
                    // }
                    // fis.close();
                    // return true;
                    // } catch (SQLException e) {
                    // e.printStackTrace();
                    // throw new
                    // RuntimeException(DBUtils.unchainSqlException(e));
                    // }
                    // }
                    //
                    // XMLSource dbSource = null;
                    // CLDRFile file;
                    // if(cached == true) {
                    // if(finalData) {
                    // file = this.getCLDRFileCache().getVettedCLDRFile(locale);
                    // } else {
                    // file = this.getCLDRFileCache().getCLDRFile(locale,
                    // resolved);
                    // }
                    // } else {
                    // // conn = getDBConnection();
                    // file = new CLDRFile(makeDBSource(locale, finalData,
                    // resolved)).setSupplementalDirectory(supplementalDataDir);
                    // }
                    // //
                    // file.write(WebContext.openUTF8Writer(response.getOutputStream()));
                    // if(voteData) {
                    // try {
                    // vet.writeVoteFile(response.getWriter(), conn, dbSource,
                    // file, formatDate(), null);
                    // } catch (SQLException e) {
                    // // TODO Auto-generated catch block
                    // e.printStackTrace();
                    // SurveyLog.logger.warning("<!-- exception: "+e+" -->");
                    // }
                    // } else {
                    // if(!isKvp) {
                    // file.write(response.getWriter());
                    // } else {
                    // // full xpath tab value
                    // java.io.Writer w = response.getWriter();
                    // //PrintWriter pw = new PrintWriter(w);
                    // for(String str : file) {
                    // String xo = file.getFullXPath(str);
                    // String v = file.getStringValue(str);
                    //
                    // w.write(xo+"\t"+v+"\n");
                    //
                    // }
                    //
                    // }
                    //
                    // }
                }
            }
            return true;
        } finally {
            if (p != null)
                p.close();
        }
    }

    /**
     * Get the output file, creating if needed. Uses a temp Connection
     *
     * @param surveyMain
     *            TODO
     * @param loc
     * @param kind
     * @return
     * @throws IOException
     * @throws SQLException
     */
    File getOutputFile(SurveyMain surveyMain, CLDRLocale loc, String kind) throws IOException, SQLException {
        /*
         * Get a java.sql.Connection to be used by fileNeedsUpdate, getLocaleTime
         */
        Connection conn = null;
        try {
            conn = surveyMain.dbUtils.getDBConnection();
            return getOutputFile(conn, loc, kind);
        } finally {
            DBUtils.close(conn);
        }
    }

    /**
     * Get and write the file
     *
     * @param conn
     * @param loc
     * @param kind
     * @return
     * @throws SQLException
     * @throws IOException
     */
    public File getOutputFile(Connection conn, CLDRLocale loc, String kind) throws SQLException, IOException {
        if (fileNeedsUpdate(conn, loc, kind)) {
            return writeOutputFile(loc, kind);
        } else {
            return sm.getDataFile(kind, loc);
        }
    }

    public Timestamp getLocaleTime(CLDRLocale loc) throws SQLException {
        Connection conn = null;
        try {
            conn = DBUtils.getInstance().getDBConnection();
            return getLocaleTime(conn, loc);
        } finally {
            DBUtils.close(conn);
        }
    }

    boolean haveVbv = false;
    public boolean outputDisabled = false;

    /**
     * Get a timestamp associated with the given CLDRLocale and java.sql.Connection.
     *
     * @param conn
     * @param loc
     * @return the Timestamp
     * @throws SQLException
     */
    public Timestamp getLocaleTime(Connection conn, CLDRLocale loc) throws SQLException {
        Timestamp theDate = null;
        if (haveVbv || DBUtils.hasTable(conn, DBUtils.Table.VOTE_VALUE.toString())) {
            if (haveVbv == false) {
                SurveyLog
                    .debug("OutputFileManager: have "
                        + DBUtils.Table.VOTE_VALUE
                        + ", commencing  output file updates ( use CLDR_NOOUTPUT=true in cldr.properties to suppress  -  CLDR_NOOUTPUT current value = "
                        + CldrUtility.getProperty("CLDR_NOOUTPUT", false));
            }
            haveVbv = true;
            Object[][] o = DBUtils.sqlQueryArrayArrayObj(conn, "select max(last_mod) from " + DBUtils.Table.VOTE_VALUE + " where locale=?", loc);
            if (o != null && o.length > 0 && o[0] != null && o[0].length > 0) {
                theDate = (Timestamp) o[0][0];
                // System.err.println("for " + loc + " = " + theDate +
                // " - len="+o.length + ":"+o[0].length);
            }
        }
        File svnFile = sm.getBaseFile(loc);
        if (svnFile.exists()) {
            Timestamp fileTimestamp = new Timestamp(svnFile.lastModified());
            if (theDate == null || fileTimestamp.after(theDate)) {
                theDate = fileTimestamp;
            }
        }

        CLDRLocale parLoc = loc.getParent();
        if (parLoc != null) {
            Timestamp parTimestamp = getLocaleTime(conn, parLoc);
            if (theDate == null || parTimestamp.after(theDate)) {
                theDate = parTimestamp;
            }
        }

        return theDate;
    }

    /**
     *
     * @param loc
     * @param kind
     * @return
     * @throws IOException
     * @throws SQLException
     */
    boolean fileNeedsUpdate(CLDRLocale loc, String kind) throws IOException, SQLException {
        Connection conn = null;
        try {
            conn = DBUtils.getInstance().getDBConnection();
            return fileNeedsUpdate(conn, loc, kind);
        } finally {
            DBUtils.close(conn);
        }
    }

    public boolean fileNeedsUpdate(Connection conn, CLDRLocale loc, String kind) throws SQLException, IOException {
        return fileNeedsUpdate(getLocaleTime(conn, loc), loc, kind);
    }

    static final boolean debugWhyUpdate = false;

    public boolean fileNeedsUpdate(Timestamp theDate, CLDRLocale loc, String kind) throws SQLException, IOException {
        File outFile = sm.getDataFile(kind, loc);
        if (!outFile.exists()) {
            if (debugWhyUpdate)
                SurveyLog.debug("Out of Date: MISSING! Must output " + loc + " / " + kind);
            return true;
        }
        Timestamp theFile = null;

        long lastMod = outFile.lastModified();
        if (outFile.exists()) {
            theFile = new Timestamp(lastMod);
        }
        if (theDate == null) {
            SurveyLog.logger.warning(" .. no data.");
            return false; // no data (?)
        }
        if (debugWhyUpdate)
            SurveyLog.debug(loc + " .. exists " + theFile + " vs " + theDate);
        if (theFile != null && !theFile.before(theDate)) {
            if (debugWhyUpdate)
                SurveyLog.debug(" .. OK, up to date.");
            return false;
        }
        if (debugWhyUpdate)
            SurveyLog.debug("Out of Date: Must output " + loc + " / " + kind + " - @" + theFile + " vs  SQL " + theDate);
        return true;
    }

    void addUpdateTasks() {
        if (CldrUtility.getProperty("CLDR_NOOUTPUT", false))
            return;

        System.err.println("addPeriodicTask... updater");
        SurveyMain.addPeriodicTask(new Runnable() {
            // Start on a different locale each time.
            int spinner = (int) Math.round(Math.random() * (double) SurveyMain.getLocales().length);

            @Override
            public void run() {
                if (outputDisabled || SurveyMain.isBusted() || !SurveyMain.isSetup) {
                    return;
                }

                final String CLDR_OUTPUT_ONLY = CldrUtility.getProperty("CLDR_OUTPUT_ONLY", null);

                if (CLDR_OUTPUT_ONLY != null) {
                    System.err.println("Only outputting -DCLDR_OUTPUT_ONLY=" + CLDR_OUTPUT_ONLY);
                }

                Connection conn = null;
                CLDRProgressTask progress = null;
                try {
                    conn = DBUtils.getInstance().getDBConnection();
                    CLDRLocale locs[] = SurveyMain.getLocales();
                    //File outFile = null;
                    // SurveyLog.logger.warning("Updater: locs to do: "
                    // +locs.length );
                    CLDRLocale loc = null;

                    for (int wrtl = 1; wrtl < locs.length; wrtl++) { // keep
                        // going
                        // while
                        // not busy

                        for (int j = 0; j < locs.length; j++) { // Try 16
                            // locales
                            // looking for
                            // one that
                            // doesn't
                            // exist. No
                            // more, due to
                            // load.
                            loc = CLDR_OUTPUT_ONLY != null ? CLDRLocale.getInstance(CLDR_OUTPUT_ONLY) // DEBUGGING
                                : locs[(spinner++) % locs.length]; // A new
                            // one
                            // each
                            // time.
                            // (normal
                            // case
                            // SurveyLog.debug("Updater: Considering: " +loc );

                            Timestamp localeTime = getLocaleTime(conn, loc);
                            SurveyLog.debug("Updater: Considering: " + loc + " - " + localeTime);
                            if (!fileNeedsUpdate(localeTime, loc, "vxml") /*
                                                                          * &&
                                                                          * !
                                                                          * fileNeedsUpdate
                                                                          * (
                                                                          * localeTime
                                                                          * ,
                                                                          * loc
                                                                          * ,
                                                                          * "xml"
                                                                          * )
                                                                          */) {
                                loc = null;
                                // progress.update(0, "Still looking.");
                            } else {
                                SurveyLog.debug("Updater: To update:: " + loc + " - " + localeTime);
                                break; // update it.
                            }
                            if (j % 16 == 0) {
                                // SurveyLog.debug("Updater: looked at " + j +
                                // " locales, sleeping..");
                                Thread.sleep(1000);
                                if (SurveyMain.hostBusy()) {
                                    SurveyLog.debug("CPU busy - exitting." + SurveyMain.osmxbean.getSystemLoadAverage());
                                    return;
                                } else {
                                    SurveyLog.debug("CPU not busy- continuing!" + SurveyMain.osmxbean.getSystemLoadAverage());
                                }
                            }
                        }

                        if (loc == null) {
                            SurveyLog.debug("None to update.");
                            // SurveyLog.logger.warning("All " + locs.length +
                            // " up to date.");
                            return; // nothing to do.
                        }

                        if (progress == null) {
                            progress = sm.openProgress("Updater", 3);
                        }
                        progress.update(1, "Update vxml:" + loc);
                        SurveyLog.debug("Updater update vxml: " + loc);
                        getOutputFile(sm, loc, "vxml");
                        getOutputFile(sm, loc, "pxml");
                        /*
                         * progress.update(2, "Writing xml:" +loc);
                         * getOutputFile(loc, "xml");
                         */
                        progress.update(3, "Done:" + loc);

                        if (SurveyMain.hostBusy()) {
                            SurveyLog.debug("Wrote " + wrtl + "locales  , but host is busy:  "
                                + SurveyMain.osmxbean.getSystemLoadAverage());
                            return;
                        } else {
                            Thread.sleep(5000);
                            if (SurveyMain.hostBusy()) {
                                SurveyLog.debug("Wrote " + wrtl + "locales, slept 5s , but host is now busy:  "
                                    + SurveyMain.osmxbean.getSystemLoadAverage());
                                return;
                            } else {
                                SurveyLog.debug("Wrote " + wrtl + "locales  , continuing! host is not busy:  "
                                    + SurveyMain.osmxbean.getSystemLoadAverage());
                            }
                        }
                    }

                    // SurveyLog.logger.warning("Finished writing " + loc);
                } catch (InterruptedException ie) {
                    SurveyLog.logger.warning("Interrupted while running Updater - goodbye: " + ie);
//                } catch (SQLException e) {
//                    SurveyLog.logException(e, "while running updater");
//                    outputDisabled = true; // SurveyMain.busted("while running updater", e);
//                } catch (IOException e) {
//                    SurveyLog.logException(e);
//                    e.printStackTrace();
//                    SurveyMain.busted("while running updater", e);
                } catch (Throwable e) {
                    SurveyLog.logException(e, "while running updater");
                    e.printStackTrace();
                    outputDisabled = true; // SurveyMain.busted("while running updater", e);
                } finally {
                    // SurveyLog.logger.warning("(exitting updater");
                    if (progress != null)
                        progress.close();
                    DBUtils.close(conn);
                }
            }
        });

        SurveyMain.addDailyTask(new Runnable() {

            @Override
            public void run() {
                SurveyMain sm = CookieSession.sm;
                //ElapsedTimer daily = new ElapsedTimer();
                // Date ourDate = new Date();
                try {
                    File usersa = sm.makeDataDir("usersa");
                    sm.reg.writeUserFile(sm, "sometime", true, new File(usersa, "usersa.xml"));
                    File users = sm.makeDataDir("users");
                    sm.reg.writeUserFile(sm, "sometime", false, new File(users, "users.xml"));
                    System.err.println("Writing users data: " + new Date());
                } catch (Throwable t) {
                    SurveyLog.logException(t, "writing user data");
                }

                addAndCommitData("vxml"); // vetted

                addAndCommitData("pxml"); // proposed

            }

            private void addAndCommitData(String type) {
                if (!tryCommit)
                    return;
                ElapsedTimer daily = new ElapsedTimer();
                try {
                    //boolean svnOk = true;
                    System.err.println("Beginning daily (or once at boot) update of SVN " + type + " data: " + new Date());
                    // quickAddAll
                    int added = 0;
                    File some = null;
                    int toupdate = 0;
                    CLDRLocale locs[] = SurveyMain.getLocales();
                    // System.err.println("Traversing..!!");
                    for (CLDRLocale l : locs) {
                        try {
                            File f = CookieSession.sm.getDataFile(type, l);
                            if (some == null) {
                                some = f.getParentFile().getParentFile().getParentFile();

                                svnCleanup(some);

                            }
                            if (!f.exists())
                                continue;
                            // SVNInfo i = svnInfo(f);
                            SVNStatus s = svnStatus(f);
                            // System.err.println(f.getAbsolutePath() + " - " +
                            // i.getKind() + " - " + s.getNodeStatus());
                            if (s == null) {
                                System.err.println("SVN: empty node status:  - " + f.getAbsolutePath());
                            } else if (s.getNodeStatus() == SVNStatusType.STATUS_UNVERSIONED) {
                                svnAdd(f);
                                added++;
                            } else if (s.getNodeStatus() != SVNStatusType.STATUS_NORMAL) {
                                // System.err.println(f.getAbsolutePath() +
                                // "  - " + s.getNodeStatus());
                                toupdate++;
                            }
                        } catch (Throwable e) {
                            SurveyLog.logException(e, "trying to get data file for " + l);
                            return;
                        }
                    }
                    if (added > 0) {
                        System.err.println("Added " + added + " unversioned files.");
                        toupdate += added;
                    }
                    if (toupdate > 0) {
                        System.err.println("Detected " + toupdate + "  files out of date. Committing:");
                        File f[] = { some };
                        try {
                            System.out.println("committed  " + some.getAbsolutePath() + " -> " + svnCommit(f));
                        } catch (SVNException e) {
                            SurveyLog.logException(e, "Trying to commit [and giving up on commits] " + some.getAbsolutePath());
                            tryCommit = false;
                        }
                    } else {
                        System.err.println("Nothing out of date.");
                    }
                } finally {
                    System.err.println("Exitting Daily " + daily.toString());
                }
            }
        });
    }

    /**
     * Client access to SVN.
     */
    private SVNClientManager ourClientManager = null;

    private synchronized SVNClientManager getClientManager() throws SVNException {
        if (ourClientManager == null) {
            if (tryCommit == false) {
                throw new SVNException(SVNErrorMessage.create(SVNErrorCode.ASSERTION_FAIL, "commits were disabled: "
                    + tryCommitWhyNot));
            }

            ourClientManager = SVNClientManager.newInstance();
        }
        return ourClientManager;
    }

    public long svnCheckout(File dir, String url) throws SVNException {
        return svnCheckout(dir, url, SVNRevision.UNDEFINED, SVNRevision.HEAD, SVNDepth.INFINITY, true);
    }

    public long svnCheckout(File dir, String url, SVNRevision r1, SVNRevision r2, SVNDepth d, boolean b) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNUpdateClient updateClient = getClientManager().getUpdateClient();
            updateClient.setIgnoreExternals(true);
            System.err.println("Checking out " + url + " into " + dir.getAbsolutePath());
            long rv = updateClient.doCheckout(SVNURL.parseURIEncoded(url), dir, r1, r2, d, b);
            System.err.println(".. Checked out  r" + rv);
            return rv;
        }
    }

    public void svnExport(File dir, String url) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNUpdateClient updateClient = getClientManager().getUpdateClient();
            updateClient.setIgnoreExternals(true);
            System.err.println("Exporting " + url + " into " + dir.getAbsolutePath());
            long rv = updateClient.doExport(SVNURL.parseURIEncoded(url), dir, SVNRevision.UNDEFINED, SVNRevision.HEAD, "native",
                false, SVNDepth.INFINITY);
            System.err.println(".. Exported r" + rv);
        }
    }

    public SVNCommitInfo svnCommit(File[] f) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNCommitClient commitClient = getClientManager().getCommitClient();
            return commitClient.doCommit(f, false, "Automated update", false, true);
        }
    }

    public long svnUpdate(File f) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNUpdateClient updateClient = getClientManager().getUpdateClient();
            return updateClient.doUpdate(f, SVNRevision.HEAD, true);
        }
    }

    public long[] svnUpdate(File f[], SVNRevision rev, SVNDepth depth, boolean allowUnversionedObstructions, boolean depthIsSticky)
        throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNUpdateClient updateClient = getClientManager().getUpdateClient();
            return updateClient.doUpdate(f, rev, depth, allowUnversionedObstructions, depthIsSticky);
        }
    }

    private void svnRemoveAndResolved(File outFile) {
        try {
            synchronized (OutputFileManager.class) {
                getClientManager().getWCClient().doResolve(outFile, true);
            }
        } catch (SVNException e) {
            SurveyLog.logException(e, "While marking " + outFile.getAbsolutePath() + " resolved.");
        } finally {
            outFile.delete();
        }
    }

    public void svnAdd(File f) throws SVNException {
        synchronized (OutputFileManager.class) {
            getClientManager().getWCClient().doAdd(f, false, false, false, true);
        }
    }

    public SVNStatus svnStatus(File item) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNStatusClient updateClient = getClientManager().getStatusClient();
            return updateClient.doStatus(item, false);
        }
    }

    public SVNInfo svnInfo(File item) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNWCClient updateClient = getClientManager().getWCClient();
            return updateClient.doInfo(item, SVNRevision.WORKING);
        }
    }

    public void svnCleanup(File item) throws SVNException {
        synchronized (OutputFileManager.class) {
            SVNWCClient updateClient = getClientManager().getWCClient();
            updateClient.doCleanup(item);
            System.err.println("-- cleanup " + item.getAbsolutePath());
        }
    }

    public void svnShutdown() {
        if (ourClientManager != null) {
            ourClientManager.dispose();
            ourClientManager = null;
            Thread.yield();
            System.err.println("Shutdown SVN client.");
        }
    }

    public void svnAddOrWarn(File subDir) {
        if (tryCommit) {
            synchronized (OutputFileManager.class) {
                try {
                    getClientManager().getWCClient().doAdd(subDir, false, false, false, false);
                } catch (SVNException e) {
                    System.err.println("warning: could not add " + subDir.getAbsolutePath() + " - " + e.getMessage());
                }
            }
        }
    }

    // statistics helpers
    private static Map<CLDRLocale, Pair<String, String>> localeNameCache = new ConcurrentHashMap<CLDRLocale, Pair<String, String>>();

    // for the statistics page - wrap locale ids in an <old data> span to show they were from the previous revision
    private static final String OLD_DATA_BEGIN = "<span class='olddata'>";
    private static final String OLD_DATA_END = "</span>";

    public static Pair<String, String> statGetLocaleDisplayName(CLDRLocale loc) {
        Pair<String, String> ret = localeNameCache.get(loc), toAdd = null;
        if (ret == null) {
            toAdd = ret = new Pair<String, String>();
        }
        // note, may concurrently modify this object- that's OK.
        if (ret.getFirst() == null) {
            // use baseline data
            ret.setFirst(loc.getDisplayName(false, null));
        }
        if (ret.getSecond() == null) {
            // uses 'on disk' (old) data.
            ret.setSecond(OLD_DATA_BEGIN + CookieSession.sm.getDiskFactory().make(loc.getBaseName(), true).getName(loc.toLanguageTag()) + OLD_DATA_END);
        }
        // needed to add it
        if (toAdd != null) {
            localeNameCache.put(loc, toAdd);
        }
        return ret;
    }

    // update the cache
    public static void updateLocaleDisplayName(CLDRFile f, CLDRLocale l) {
        try {
            Pair<String, String> ret = statGetLocaleDisplayName(l);
            String newValue = (f.getName(l.getBaseName()));
            if (DEBUG) {
                if (!newValue.equals(ret.getSecond())) {
                    System.out.println("Setting: " + newValue + " insteadof " + ret.getSecond() + " for " + ret.getFirst());
                }
            }
            ret.setSecond(newValue);
        } catch (Throwable t) {
            SurveyLog.logException(t, "Updating the Locale Display Name for " + l.getBaseName() + " with language tag " + l.toLanguageTag());
        }
    }

}
