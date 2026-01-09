package soot.jimple.infoflow.memory;

import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import soot.jimple.infoflow.memory.IMemoryBoundedSolver.IMemoryBoundedSolverStatusNotification;

/**
 * Abstract base class for all watcher implementations that can terminate the
 * data flow solvers abnormally during execution for some reason
 * 
 * @author Steven Arzt
 */
public abstract class AbstractSolverWatcher implements IMemoryBoundedSolverStatusNotification {

	/**
	 * Enumeration containing all states in which a solver can be
	 * 
	 * @author Steven Arzt
	 *
	 */
	public enum SolverState {
		/**
		 * The solver has not been started yet
		 */
		IDLE,
		/**
		 * The solver is running
		 */
		RUNNING,
		/**
		 * The solver has completed its work
		 */
		DONE
	}

	protected final Map<IMemoryBoundedSolver, SolverState> solvers = new ConcurrentHashMap<>();
	protected ISolversTerminatedCallback terminationCallback = null;
	protected volatile boolean stopped = false;

	@Override
	public void notifySolverStarted(IMemoryBoundedSolver solver) {
		solvers.put(solver, SolverState.RUNNING);
	}

	@Override
	public void notifySolverTerminated(IMemoryBoundedSolver solver) {
		solvers.put(solver, SolverState.DONE);
	}

	/**
	 * Resets the internal state of the watcher so that it can be used again after
	 * being stopped
	 */
	public void reset() {
		for (IMemoryBoundedSolver solver : this.solvers.keySet())
			this.solvers.put(solver, SolverState.IDLE);
		this.stopped = false;
	}

	/**
	 * Sets a callback that shall be invoked when the solvers have been terminated
	 * abnormally by this watcher
	 * 
	 * @param terminationCallback The callback to invoke when the solvers have been
	 *                            terminated by this watcher
	 */
	public void setTerminationCallback(ISolversTerminatedCallback terminationCallback) {
		this.terminationCallback = terminationCallback;
	}

	/**
	 * Adds a solver that shall be terminated when the timeout is reached
	 * 
	 * @param solver A solver that shall be terminated when the timeout is reached
	 */
	public void addSolver(IMemoryBoundedSolver solver) {
		if (solver != null) {
			this.solvers.put(solver, SolverState.IDLE);
			solver.addStatusListener(this);
		}
	}

	/**
	 * Adds multiple solvers that shall be terminated when the timeout is reached
	 * 
	 * @param solvers The solvers that shall be terminated when the timeout is
	 *                reached
	 */
	public void addSolvers(IMemoryBoundedSolver[] solvers) {
		Arrays.stream(solvers).forEach(s -> addSolver(s));
	}

	/**
	 * Removes the given solver from the watch list. The given solver will no longer
	 * ne notified when the memory threshold is reached.
	 * 
	 * @param solver The solver to remove from the watch list
	 * @return True if the given solver was found in the watch list, otherwise false
	 */
	public boolean removeSolver(IMemoryBoundedSolver solver) {
		return this.solvers.remove(solver) != null;
	}

	/**
	 * Clears the list of solvers registered with this memory watcher
	 */
	public void clearSolvers() {
		this.solvers.clear();
	}

	/**
	 * Shuts down the watcher and frees all resources associated with it. Note that
	 * this will also remove all references to the solvers to avoid keeping the
	 * solvers in memory. Once closed, a watcher cannot be reused, not even through
	 * a call to <code>reset</code>.
	 */
	public void close() {
		clearSolvers();
	}

	/**
	 * Forces the termination of all registered solvers
	 */
	public void forceTerminate(ISolverTerminationReason reason) {
		for (IMemoryBoundedSolver solver : solvers.keySet()) {
			solver.forceTerminate(reason);
		}
	}

	/**
	 * Starts the watcher
	 */
	public void start() {
		this.stopped = false;
	}

	/**
	 * Stops the watcher so that it no longer interferes with solver execution
	 */
	public void stop() {
		this.stopped = true;
	}

}