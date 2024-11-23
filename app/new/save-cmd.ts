import { openDatabase } from "~/lib/persistence/db";

export async function saveCommandToIndexedDB(currentID: string, messages: {
	role: string;
	content: string;
	createdAt: string;
}[]) {
	try {
		const db = await openDatabase();
		if (!db) throw new Error("Failed to open IndexedDB");
		const transaction = db.transaction("chats", "readwrite");
		const store = transaction.objectStore("chats");
		const message = {
			id: currentID,
			messages,
			urlId: currentID,
			description: `Chat #${currentID}`,
			timestamp: new Date().toISOString(),
		};
		store.put(message);
		transaction.oncomplete = () => {
			console.log("Message saved to IndexedDB:", message);
		};
		transaction.onerror = (err) => {
			console.error("Failed to save message:", err);
		};
	} catch (error) {
		console.error("Error saving message to IndexedDB:", error);
	}
}
