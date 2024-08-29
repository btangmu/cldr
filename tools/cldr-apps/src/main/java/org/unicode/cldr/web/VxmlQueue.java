package org.unicode.cldr.web;

import java.io.IOException;
import java.io.StringWriter;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Semaphore;
import java.util.logging.Logger;
import org.unicode.cldr.util.*;
import org.unicode.cldr.util.TimeDiff;
import org.unicode.cldr.web.CLDRProgressIndicator.CLDRProgressTask;

public class VxmlQueue {
    private static final Logger logger = SurveyLog.forClass(VxmlQueue.class);

    private static final boolean DEBUG = true;
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

    private static class QueueEntry {
        private Task currentTask = null;
        private String output = "";
        private Boolean done = false;
    }

    /** Semaphore to ensure that only one vetter generates VXML at a time. */
    private static final Semaphore OnlyOneVetter = new Semaphore(1);

    public static class Task implements Runnable {
        public final class CLDRProgressCallback extends VxmlGenerator.ProgressCallback {
            private final CLDRProgressTask progress;
            private final Thread thread;

            private String localeName = "";

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
                } else if (!this.localeName.isEmpty()) {
                    remStr += " -- Locale " + this.localeName;
                }
                setStatus(remStr);
                return remStr;
            }

            public void nudge(CLDRLocale loc) {
                if (!myThread.isAlive()) {
                    throw new RuntimeException("Not Running- stop now.");
                }
                this.localeName = loc.getDisplayName();
                long now = System.currentTimeMillis();
                n++;
                /*
                 * TODO: explain/encapsulate these magic numbers!
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
        private String status = WAITING_IN_LINE_MESSAGE;
        private Status statusCode = Status.WAITING; // Need to start out as waiting.

        private void setStatus(String status) {
            this.status = status;
        }

        private final StringWriter stringWriter = new StringWriter();

        private final Results results;

        /**
         * Construct a Runnable object specifically for VXML
         *
         * @param entry the QueueEntry
         * @param results the VxmlResults to modify
         */
        private Task(QueueEntry entry, Results results) {
            if (DEBUG) {
                System.out.println("Creating task for VXML");
            }
            this.entry = entry;
            this.results = results;
        }

        @Override
        public void run() {
            statusCode = Status.WAITING;
            // final CLDRProgressTask progress = CookieSession.sm.openProgress("VXML", maxn);

            if (DEBUG) {
                System.out.println("Starting up VXML task, " + taskDescription());
            }

            try {
                status = "Waiting...";
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
                    processCriticalWork();
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
            }
        }

        private String taskDescription() {
            return "thread " + myThread.getId() + ", " + LocalTime.now();
        }

        private void processCriticalWork()
                throws ExecutionException {
            status = "Beginning Process, Calculating";
            // compare VettingViewer class
            VxmlGenerator vg = new VxmlGenerator();
            Set<CLDRLocale> sortSet = OutputFileManager.createVxmlLocaleSet();
            maxn = sortSet.size();
            statusCode = Status.PROCESSING;
            start = System.currentTimeMillis();
            last = start;
            n = 0;
            vg.setProgressCallback(new CLDRProgressCallback(null /* progress */, Thread.currentThread()));

            if (DEBUG) {
                System.out.println("Starting generation of VXML, " + taskDescription());
            }
            // Compare generatePriorityItemsSummary
            vg.generate(sortSet, stringWriter);
            if (myThread.isAlive()) {
                entry.done = true;
                if (DEBUG) {
                    System.out.println("Finished generation of VXML, " + taskDescription());
                    System.out.println("processCriticalWork set entry.output = " + entry.output);
                }
            } else {
                if (DEBUG) {
                    System.out.println(
                            "Stopped generation of VXML (thread is dead), " + taskDescription());
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
    public static class Args {
        private final QueueMemberId qmi;
        private final LoadingPolicy loadingPolicy;

        public Args(QueueMemberId qmi, LoadingPolicy loadingPolicy) {
            this.qmi = qmi;
            this.loadingPolicy = loadingPolicy;
        }
    }

    /**
     * Results for getOutput
     *
     * <p>These fields get filled in by getOutput, and referenced by the caller after getOutput
     * returns
     */
    public static class Results {
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
     * Start running, or continue running, the long-running task that generates VXML.
     * This is called once for each request, including the initial request
     * that starts VXML generation, and subsequent requests that query the
     * status or trigger early termination of the task.
     *
     * @param args the VxmlQueue.Args
     * @param results the VxmlQueue.Results
     * @return the status message
     * @throws IOException
     *
     *     <p>This is modeled on VettingViewerQueue.getPriorityItemsSummaryOutput
     */
    public synchronized String getOutput(Args args, Results results) throws IOException {
        QueueEntry entry = getEntry(args.qmi);
        Task t = entry.currentTask;
        if (args.loadingPolicy != LoadingPolicy.FORCESTOP) {
            if (entry.done) {
                setPercent(100);
                results.status = Status.READY;
                results.output.append(entry.output);
                if (DEBUG) {
                    final String desc = (t == null) ? "[null task]" : t.taskDescription();
                    System.out.println("Got result, calling stop for VXML, " + desc);
                }
                stop(entry);
                return VXML_MESSAGE_COMPLETE;
            }
        } else {
            if (DEBUG) {
                final String desc = (t == null) ? "[null task]" : t.taskDescription();
                System.out.println("Forced stop of VXML, " + desc);
            }
            stop(entry);
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

        // Note: May be better to use SurveyThreadManager.getExecutorService().invoke() (rather than
        // a raw thread) ... compare VettingViewerQueue.getPriorityItemsSummaryOutput
        t = entry.currentTask = new Task(entry, results);
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
