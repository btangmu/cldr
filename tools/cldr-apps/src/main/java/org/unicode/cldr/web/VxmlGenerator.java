package org.unicode.cldr.web;

// compare VettingViewer class
public class VxmlGenerator {
    /** Class that allows the relaying of progress information */
    public static class ProgressCallback {
        /**
         * Note any progress. This will be called before any output is printed. It will be called
         * approximately once per xpath.
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
