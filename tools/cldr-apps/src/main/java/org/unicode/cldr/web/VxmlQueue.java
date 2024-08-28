package org.unicode.cldr.web;

import java.io.IOException;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Semaphore;
import java.util.logging.Logger;
import org.unicode.cldr.util.*;
import org.unicode.cldr.util.TimeDiff;
import org.unicode.cldr.web.CLDRProgressIndicator.CLDRProgressTask;
import org.unicode.cldr.web.api.GenerateVxml;

public class VxmlQueue {
    private static final Logger logger = SurveyLog.forClass(VxmlQueue.class);

    private static final boolean DEBUG = false;
    private static final String WAITING_IN_LINE_MESSAGE = "Waiting in line";

    private static final class VxmlQueueHelper {
        static VxmlQueue instance = new VxmlQueue();
    }

    /**
     * Get the singleton instance of the queue
     *
     * @return the singleton instance
     */
    public static VxmlQueue getInstance() {
        return VxmlQueueHelper.instance;
    }

    /** A unique key for storing QueueEntry objects in QueueMemberId objects */
    private static final String KEY = VxmlQueue.class.getName();

    /** Status of a Task */
    public enum Status {
        /** Waiting on other users/tasks */
        WAITING,
        /** Processing in progress */
        PROCESSING,
        /** Contents are available */
        READY,
        /** Stopped, due to error or successful completion */
        STOPPED,
    }

    /** What policy should be used when querying the queue? */
    public enum LoadingPolicy {
        /** (Default) - start if not started */
        START,
        /** Don't start if not started. Just check. */
        NOSTART,
        /** Stop. */
        FORCESTOP
    }

    // Compare VettingViewerQueue.VVOutput
    private static class VxmlOutput {
        public VxmlOutput(StringBuffer s) {
            output = s;
        }

        private final StringBuffer output;
    }

    private static class QueueEntry {
        private Task currentTask = null;
        // TODO: no need for Organization here. This is based on VettingViewerQueue.QueueEntry
        // It's doubtful that any map is needed here at all...
        private final Map<Organization, VxmlOutput> output = new TreeMap<>();
    }

    /** Semaphore to ensure that only one vetter accesses VV at a time. */
    private static final Semaphore OnlyOneVetter = new Semaphore(1);

    private class Task implements Runnable {
        /** A VxmlGenerator.ProgressCallback that updates a CLDRProgressTask */
        private final class CLDRProgressCallback extends VxmlGenerator.ProgressCallback {
            private final CLDRProgressTask progress;
            private final Thread thread;

            private CLDRProgressCallback(CLDRProgressTask progress, Thread thread) {
                this.progress = progress;
                this.thread = thread;
            }

            private String setRemStr(long now) {
                double per = (double) (now - start) / (double) n;
                long rem = (long) ((maxn - n) * per);
                String remStr = "Estimated completion: " + TimeDiff.timeDiff(now, now - rem);
                if (rem <= 1500) { // Less than 1.5 seconds remaining
                    remStr = "Finishing...";
                }
                setStatus(remStr);
                return remStr;
            }

            public void nudge() {
                if (!myThread.isAlive()) {
                    throw new RuntimeException("Not Running- stop now.");
                }
                long now = System.currentTimeMillis();
                n++;
                /*
                 * TODO: explain/encapsulate these magic numbers! 5? 10? 1200? 500?
                 */
                if (n > (maxn - 5)) {
                    maxn = n + 10;
                }
                if ((now - last) > 1 /* was 1200 */) {
                    if (DEBUG) {
                        System.out.println("Task.nudge() for VXML, " + taskDescription());
                    }
                    last = now;
                    if (n > 1 /* was 500 */) {
                        progress.update(n, setRemStr(now));
                    } else {
                        progress.update(n);
                    }
                }
            }

            public void done() {
                // note: this method is possibly never called
                progress.update("Done!");
            }

            public boolean isStopped() {
                // if the calling thread is gone, stop processing
                return stop || !(thread.isAlive());
            }
        }

        private Thread myThread = null;
        private boolean stop = false;

        private final QueueEntry entry;
        private int maxn;
        private int n = 0;
        private long start = -1;
        private long last;
        private final Organization usersOrg;
        private String status = WAITING_IN_LINE_MESSAGE;
        private Status statusCode = Status.WAITING; // Need to start out as waiting.

        private void setStatus(String status) {
            this.status = status;
        }

        private final StringBuffer aBuffer = new StringBuffer();

        private final GenerateVxml.VxmlResponse response;

        /**
         * Construct a Runnable object specifically for VXML
         *
         * @param entry the QueueEntry
         * @param usersOrg the user's organization
         * @param response the VxmlResponse to modify
         */
        private Task(QueueEntry entry, Organization usersOrg, GenerateVxml.VxmlResponse response) {
            if (DEBUG) {
                System.out.println("Creating task for VXML");
            }
            this.entry = entry;
            this.usersOrg = usersOrg;
            this.response = response;
        }

        @Override
        public void run() {
            statusCode = Status.WAITING;
            /*
             * TODO: explain this magic number! Why add 100?
             * Reference: https://unicode-org.atlassian.net/browse/CLDR-15369
             */
            final CLDRProgressTask progress = CookieSession.sm.openProgress("vv: VXML", maxn + 100);

            if (DEBUG) {
                System.out.println("Starting up vv task: VXML, " + taskDescription());
            }

            try {
                status = "Waiting...";
                progress.update("Waiting...");
                if (DEBUG) {
                    System.out.println("Calling OnlyOneVetter.acquire(), " + taskDescription());
                }
                OnlyOneVetter.acquire();
                if (DEBUG) {
                    System.out.println("Did call OnlyOneVetter.acquire(), " + taskDescription());
                }
                try {
                    if (stop) {
                        // this NEVER happens?
                        if (DEBUG) {
                            System.out.println(
                                    "VxmlQueue.Task.run -- stopping, " + taskDescription());
                        }
                        status = "Stopped on request.";
                        statusCode = Status.STOPPED;
                        return;
                    }
                    processCriticalWork(progress);
                } finally {
                    // this happens sometimes six minutes after pressing Stop button
                    if (DEBUG) {
                        System.out.println("Calling OnlyOneVetter.release(), " + taskDescription());
                    }
                    OnlyOneVetter.release();
                }
                status = "Finished.";
                statusCode = Status.READY;
            } catch (RuntimeException | InterruptedException | ExecutionException re) {
                SurveyLog.logException(logger, re, "While generating VXML, " + taskDescription());
                status = "Exception! " + re + ", " + taskDescription();
                statusCode = Status.STOPPED;
            } finally {
                // don't change the status
                if (progress != null) {
                    progress.close();
                }
            }
        }

        private String taskDescription() {
            return "thread " + myThread.getId() + ", " + LocalTime.now();
        }

        private void processCriticalWork(final CLDRProgressTask progress)
                throws ExecutionException {
            status = "Beginning Process, Calculating";
            // compare VettingViewer class
            VxmlGenerator vg = new VxmlGenerator();

            // TODO: some code here duplicates what is in generateVxml...
            Set<CLDRLocale> sortSet = new TreeSet<>();
            sortSet.addAll(SurveyMain.getLocalesSet());
            // skip "en" and "root", since they should never be changed by the Survey Tool
            sortSet.remove(CLDRLocale.getInstance("en"));
            sortSet.remove(CLDRLocale.getInstance(LocaleNames.ROOT));
            removeMulLocales(sortSet);
            maxn = sortSet.size();
            progress.update("Blah blah in processCriticalWork"); // TODO
            statusCode = Status.PROCESSING;
            start = System.currentTimeMillis();
            last = start;
            n = 0;
            vg.setProgressCallback(new CLDRProgressCallback(progress, Thread.currentThread()));

            if (DEBUG) {
                System.out.println("Starting generation of VXML, " + taskDescription());
            }
            // Compare generatePriorityItemsSummary
            vg.generateVxml(sortSet, aBuffer, response);
            if (myThread.isAlive()) {
                if (DEBUG) {
                    System.out.println("Finished generation of VXML, " + taskDescription());
                }
                entry.output.put(usersOrg, new VxmlOutput(aBuffer));
            } else {
                if (DEBUG) {
                    System.out.println(
                            "Stopped generation of VXML (thread is dead), " + taskDescription());
                }
            }
        }

        /** Remove "mul", "mul_ZZ", etc. */
        private void removeMulLocales(Set<CLDRLocale> sortSet) {
            Iterator<CLDRLocale> itr = sortSet.iterator();
            while (itr.hasNext()) {
                CLDRLocale loc = itr.next();
                if (loc.getBaseName().startsWith(LocaleNames.MUL)) {
                    itr.remove();
                }
            }
        }

        private int getPercent() {
            if (n <= 0 || maxn <= 0) {
                return 0;
            } else if (n >= maxn) {
                return 100;
            } else {
                int p = (n * 100) / maxn;
                return (p > 0) ? p : 1;
            }
        }
    }

    /** Arguments for getOutput */
    public class Args {
        private final QueueMemberId qmi;
        private final Organization usersOrg; // TODO: superfluous?
        private final LoadingPolicy loadingPolicy;

        public Args(QueueMemberId qmi, Organization usersOrg, LoadingPolicy loadingPolicy) {
            this.qmi = qmi;
            this.usersOrg = usersOrg;
            this.loadingPolicy = loadingPolicy;
        }
    }

    /**
     * Results for getOutput
     *
     * <p>These fields get filled in by getOutput, and referenced by the caller after getOutput
     * returns
     */
    public class Results {
        public Status status = Status.STOPPED;
        public Appendable output = new StringBuilder();
    }

    /*
     * Messages returned by getOutput
     */
    private static final String VXML_MESSAGE_COMPLETE = "Completed successfully";
    private static final String VXML_MESSAGE_STOPPED_ON_REQUEST = "Stopped on request";
    private static final String VXML_MESSAGE_PROGRESS = "In Progress";
    private static final String VXML_MESSAGE_STOPPED_STUCK = "Stopped (refresh if stuck)";
    private static final String VXML_MESSAGE_NOT_LOADING = "Not loading. Click the button to load.";
    private static final String VXML_MESSAGE_STARTED = "Started new task";

    /**
     * Return the status of the VXML request
     *
     * @param args the VxmlQueue.Args
     * @param results the VxmlQueue.Results
     * @param response the VxmlResponse to fill in
     * @return the status message, or null
     * @throws IOException
     *     <p>This is modeled on VettingViewerQueue.getPriorityItemsSummaryOutput
     */
    public synchronized String getOutput(
            Args args, Results results, GenerateVxml.VxmlResponse response) throws IOException {
        QueueEntry entry = getEntry(args.qmi);
        Task t = entry.currentTask;
        if (args.loadingPolicy != LoadingPolicy.FORCESTOP) {
            VxmlOutput res = entry.output.get(args.usersOrg);
            if (res != null) {
                setPercent(100);
                results.status = Status.READY;
                results.output.append(res.output);
                if (DEBUG) {
                    final String desc = (t == null) ? "[null task]" : t.taskDescription();
                    System.out.println("Got result, calling stop for VXML, " + desc);
                }
                stop(entry);
                entry.output.remove(args.usersOrg);
                return VXML_MESSAGE_COMPLETE;
            }
        } else {
            if (DEBUG) {
                final String desc = (t == null) ? "[null task]" : t.taskDescription();
                System.out.println("Forced stop of VXML, " + desc);
            }
            stop(entry);
            entry.output.remove(args.usersOrg);
            results.status = Status.STOPPED;
            return VXML_MESSAGE_STOPPED_ON_REQUEST;
        }
        if (t != null) {
            String waiting = waitingString();
            results.status = Status.PROCESSING;
            if (t.myThread.isAlive()) {
                // get progress from current thread
                results.status = t.statusCode;
                if (results.status != Status.WAITING) {
                    waiting = "";
                }
                setPercent(t.getPercent());
                return VXML_MESSAGE_PROGRESS + ": " + waiting + t.status;
            } else {
                setPercent(0);
                return VXML_MESSAGE_STOPPED_STUCK + " " + t.status;
            }
        }
        if (args.loadingPolicy == LoadingPolicy.NOSTART) {
            results.status = Status.STOPPED;
            setPercent(0);
            return VXML_MESSAGE_NOT_LOADING;
        }

        // TODO: May be better to use SurveyThreadManager.getExecutorService().invoke() (rather than
        // a raw thread) but would require
        // some restructuring
        t = entry.currentTask = new Task(entry, args.usersOrg, response);
        t.myThread = SurveyThreadManager.getThreadFactory().newThread(t);
        if (DEBUG) {
            System.out.println("Starting new thread for VXML, " + t.taskDescription());
        }
        t.myThread.start();

        results.status = Status.PROCESSING;
        setPercent(0);
        final String waitStr = waitingString();
        if (WAITING_IN_LINE_MESSAGE.equals(t.status) && waitStr.isEmpty()) {
            // Simplify “Started new task: Waiting in line” to "Waiting in line"
            return WAITING_IN_LINE_MESSAGE;
        }
        return VXML_MESSAGE_STARTED + ": " + waitStr + t.status;
    }

    private String waitingString() {
        int aheadOfMe = totalUsersWaiting();
        return (aheadOfMe > 0) ? (aheadOfMe + " users waiting - ") : "";
    }

    private void stop(QueueEntry entry) {
        Task t = entry.currentTask;
        if (t != null) {
            if (t.myThread.isAlive() && !t.stop) {
                if (DEBUG) {
                    System.out.println(
                            "Alive; stop() setting stop = true for VXML, " + t.taskDescription());
                }
                t.stop = true;
                t.myThread.interrupt();
                if (DEBUG) {
                    System.out.println(
                            "Alive; called interrupt() for VXML, " + t.taskDescription());
                }
            } else if (DEBUG) {
                System.out.println("Not alive or already stopped for VXML, " + t.taskDescription());
            }
            entry.currentTask = null;
        } else if (DEBUG) {
            System.out.println("Task was null in stop() for VXML");
        }
    }

    private QueueEntry getEntry(QueueMemberId qmi) {
        QueueEntry entry = (QueueEntry) qmi.get(KEY);
        if (entry == null) {
            entry = new QueueEntry();
            qmi.put(KEY, entry);
        }
        return entry;
    }

    private static int totalUsersWaiting() {
        return (OnlyOneVetter.getQueueLength());
    }

    private int percent = 0;

    private void setPercent(int p) {
        percent = p;
    }

    public int getPercent() {
        return percent;
    }
}
