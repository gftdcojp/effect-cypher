// Merkle DAG: tx_manager_v1 -> withReadTx, withWriteTx
// Transaction management with direct session usage
// Dependencies: SessionLayer

import type { ManagedTransaction, Session } from "neo4j-driver";

/**
 * Executes a function within a read transaction scope
 * The transaction is automatically committed on success or rolled back on failure
 *
 * @param session - Neo4j session to execute the transaction
 * @param f - Function to execute within the transaction
 * @returns Promise that resolves to the transaction result
 */
export const withReadTx = async <A>(
	session: Session,
	f: (tx: ManagedTransaction) => Promise<A>,
): Promise<A> => {
	return session.executeRead(f);
};

/**
 * Executes a function within a write transaction scope
 * The transaction is automatically committed on success or rolled back on failure
 *
 * @param session - Neo4j session to execute the transaction
 * @param f - Function to execute within the transaction
 * @returns Promise that resolves to the transaction result
 */
export const withWriteTx = async <A>(
	session: Session,
	f: (tx: ManagedTransaction) => Promise<A>,
): Promise<A> => {
	return session.executeWrite(f);
};

/**
 * Executes multiple operations in a single read transaction
 * Useful for batch read operations that need consistency
 *
 * @param session - Neo4j session to execute the transaction
 * @param operations - Array of functions to execute in the transaction
 * @returns Promise that resolves to array of operation results
 */
export const withReadTxBatch = async <A>(
	session: Session,
	operations: Array<(tx: ManagedTransaction) => Promise<A>>,
): Promise<readonly A[]> => {
	return withReadTx(session, async (tx) => {
		const results: A[] = [];
		for (const op of operations) {
			results.push(await op(tx));
		}
		return results as readonly A[];
	});
};

/**
 * Executes multiple operations in a single write transaction
 * Useful for batch write operations that need atomicity
 *
 * @param session - Neo4j session to execute the transaction
 * @param operations - Array of functions to execute in the transaction
 * @returns Promise that resolves to array of operation results
 */
export const withWriteTxBatch = async <A>(
	session: Session,
	operations: Array<(tx: ManagedTransaction) => Promise<A>>,
): Promise<readonly A[]> => {
	return withWriteTx(session, async (tx) => {
		const results: A[] = [];
		for (const op of operations) {
			results.push(await op(tx));
		}
		return results as readonly A[];
	});
};

/**
 * Error thrown when transaction execution fails
 */
export class TransactionError extends Error {
	readonly _tag = "TransactionError";

	constructor(
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = "TransactionError";
	}
}
