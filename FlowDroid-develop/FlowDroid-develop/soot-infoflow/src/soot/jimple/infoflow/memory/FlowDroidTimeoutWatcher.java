package soot.jimple.infoflow.memory;

import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import soot.jimple.infoflow.memory.reasons.TimeoutReason;
import soot.jimple.infoflow.results.InfoflowResults;
import soot.jimple.infoflow.util.ThreadUtils;

/**
 * Class for enforcing timeouts on IFDS solvers
 * 
 * @author Steven Arzt
 *
 */
public class FlowDroidTimeoutWatcher extends AbstractSolverWatcher {

	private final Logger logger = LoggerFactory.getLogger(getClass());

	private final long timeout;
	private final InfoflowResults results;

	/**
	 * Creates a new instance of the {@link FlowDroidTimeoutWatcher} class
	 * 
	 * @param timeout The timeout in seconds after which the solvers shall be
	 *                stopped
	 */
	public FlowDroidTimeoutWatcher(long timeout) {
		this.timeout = timeout;
		this.results = null;
	}

	/**
	 * Creates a new instance of the {@link FlowDroidTimeoutWatcher} class
	 * 
	 * @param timeout The timeout in seconds after which the solvers shall be
	 *                stopped
	 * @param res     The InfoflowResults object
	 */
	public FlowDroidTimeoutWatcher(long timeout, InfoflowResults res) {
		this.timeout = timeout;
		this.results = res;
	}

	/**
	 * Gets the timeout after which the IFDS solvers are aborted
	 * 
	 * @return The timeout after which the IFDS solvers are aborted
	 */
	public long getTimeout() {
		return this.timeout;
	}

	@Override
	public void start() {
		super.start();
		final long startTime = System.nanoTime();
		logger.info("FlowDroid timeout watcher started");

		ThreadUtils.createGenericThread(new Runnable() {

			@Override
			public void run() {
				// Sleep until we have reached the timeout
				boolean allTerminated = isTerminated();

				long timeoutNano = TimeUnit.SECONDS.toNanos(timeout);
				while (!stopped && ((System.nanoTime() - startTime) < timeoutNano)) {
					allTerminated = isTerminated();
					if (allTerminated) {
						break;
					}

					try {
						Thread.sleep(1000);
					} catch (InterruptedException e) {
						// There's little we can do here
					}
				}
				long timeElapsed = TimeUnit.NANOSECONDS.toSeconds(System.nanoTime() - startTime);

				// If things have not stopped on their own account, we force
				// them to
				if (!stopped && !allTerminated) {
					logger.warn("Timeout reached, stopping the solvers...");
					if (results != null) {
						results.addException("Timeout reached");
					}

					TimeoutReason reason = new TimeoutReason(timeElapsed, timeout);
					forceTerminate(reason);

					if (terminationCallback != null) {
						terminationCallback.onSolversTerminated();
					}
				}

				logger.info("FlowDroid timeout watcher terminated");
			}

			private boolean isTerminated() {
				// Check whether all solvers in our watchlist have finished
				// their work
				for (IMemoryBoundedSolver solver : solvers.keySet()) {
					if (solvers.get(solver) != SolverState.DONE || !solver.isTerminated())
						return false;
				}
				return true;
			}

		}, "FlowDroid Timeout Watcher", true).start();
	}

}
