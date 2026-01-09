package soot.jimple.infoflow.memory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import soot.jimple.infoflow.memory.MemoryWarningSystem.OnMemoryThresholdReached;
import soot.jimple.infoflow.memory.reasons.OutOfMemoryReason;
import soot.jimple.infoflow.results.InfoflowResults;

/**
 * FlowDroid's implementation of a handler for the memory warning system
 * 
 * @author Steven Arzt
 *
 */
public class FlowDroidMemoryWatcher extends AbstractSolverWatcher {

	private final Logger logger = LoggerFactory.getLogger(getClass());
	private final MemoryWarningSystem warningSystem = new MemoryWarningSystem();

	private final InfoflowResults results;
	private ISolversTerminatedCallback terminationCallback = null;

	/**
	 * Creates a new instance of the {@link FlowDroidMemoryWatcher} class
	 */
	public FlowDroidMemoryWatcher() {
		this(null);
	}

	/**
	 * Creates a new instance of the {@link FlowDroidMemoryWatcher} class
	 * 
	 * @param threshold The threshold at which to abort the workers
	 */
	public FlowDroidMemoryWatcher(double threshold) {
		this(null, threshold);
	}

	/**
	 * Creates a new instance of the {@link FlowDroidMemoryWatcher} class
	 * 
	 * @param res The result object in which to register any abortions
	 */
	public FlowDroidMemoryWatcher(InfoflowResults res) {
		this(res, 0.9d);
	}

	/**
	 * Creates a new instance of the {@link FlowDroidMemoryWatcher} class
	 * 
	 * @param res       The result object in which to register any abortions
	 * @param threshold The threshold at which to abort the workers
	 */
	public FlowDroidMemoryWatcher(InfoflowResults res, double threshold) {
		// Register ourselves in the warning system
		warningSystem.addListener(new OnMemoryThresholdReached() {

			@Override
			public void onThresholdReached(long usedMemory, long maxMemory) {
				if (!stopped) {
					// Add the incident to the result object
					if (results != null)
						results.addException("Memory threshold reached");

					// We stop the data flow analysis
					forceTerminate();
					logger.warn("Running out of memory, solvers terminated");
					if (terminationCallback != null)
						terminationCallback.onSolversTerminated();
				}
			}

		});
		warningSystem.setWarningThreshold(threshold);
		this.results = res;
	}

	@Override
	public void close() {
		warningSystem.close();
	}

	/**
	 * Forces the termination of all registered solvers
	 */
	public void forceTerminate() {
		Runtime runtime = Runtime.getRuntime();
		long usedMem = runtime.totalMemory() - runtime.freeMemory();
		forceTerminate(new OutOfMemoryReason(usedMem));
	}

}
