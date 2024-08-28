package org.unicode.cldr.web;

import java.io.StringWriter;
import java.io.Writer;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import org.unicode.cldr.util.CLDRLocale;

// compare VettingViewer class
public class VxmlGenerator {

    private Set<CLDRLocale> sortSet = null;

    public void generate(
            Set<CLDRLocale> sortSet)
            throws ExecutionException {
        this.sortSet = sortSet;
        try (Writer out = new StringWriter()) {
            // TODO: get the booleans somewhere, or remove the parameters
            // -- in practice, we want them all true
            OutputFileManager.generateVxml(
                    this, out, true, // outputFiles
                    true, // removeEmpty
                    true); // verifyConsistent
        } catch (Exception e) {
            throw new ExecutionException(e);
        }
    }

    public Set<CLDRLocale> getSortSet() {
        return sortSet;
    }

    public void update(CLDRLocale loc) {
        if (progressCallback.isStopped()) {
            throw new RuntimeException("Requested to stop");
        }
        progressCallback.nudge(loc); // Let the user know we're moving along
    }

    /** Class that allows the relaying of progress information */
    public static class ProgressCallback {
        public void nudge(CLDRLocale loc) {}

        /** Called when all operations are complete. */
        public void done() {}

        /**
         * Return true to cause an early stop.
         *
         * @return true or false
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
