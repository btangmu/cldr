package org.unicode.cldr.web;

import java.io.StringWriter;
import java.io.Writer;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import org.unicode.cldr.util.CLDRLocale;
import org.unicode.cldr.web.api.GenerateVxml;

// compare VettingViewer class
public class VxmlGenerator {
    public void generateVxml(
            Set<CLDRLocale> sortSet, StringBuffer aBuffer, GenerateVxml.VxmlResponse response)
            throws ExecutionException {
        try (Writer out = new StringWriter()) {
            // TODO: get the booleans somewhere, or remove the parameters
            // -- in practice, we want them all true
            OutputFileManager.generateVxml(
                    this, out, true, // outputFiles
                    true, // removeEmpty
                    true); // verifyConsistent
            response.output = out.toString();
        } catch (Exception e) {
            throw new ExecutionException(e);
        }
    }

    public void update(CLDRLocale loc) {
        if (progressCallback.isStopped()) {
            throw new RuntimeException("Requested to stop");
        }
        progressCallback.nudge(); // Let the user know we're moving along
    }

    /** Class that allows the relaying of progress information */
    public static class ProgressCallback {
        /**
         * Note any progress. This will be called before any output is produced. It will be called
         * approximately once per locale.
         */
        public void nudge() {}

        /** Called when all operations are complete. */
        public void done() {}

        /**
         * Return true to cause an early stop.
         *
         * @return
         */
        public boolean isStopped() {
            return false;
        }
    }
    /*
     * null instance by default
     */
    private ProgressCallback progressCallback = new ProgressCallback();

    public void setProgressCallback(ProgressCallback newCallback) {
        progressCallback = newCallback;
    }
}
