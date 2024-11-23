import { openDatabase } from "~/lib/persistence/db";

export async function saveCommandToIndexedDB(commandData: {
	command: string;
	link: string;
	path: string;
	dir: string;
	sub_dir: string;
}) {
	try {
		const db = await openDatabase();
		if (!db) throw new Error("Failed to open IndexedDB");
		const transaction = db.transaction("chats", "readwrite");
		const store = transaction.objectStore("chats");
		const message = {
			id: new Date().toISOString(),
			messages: [
				{
					role: "assistant",
					content: `Executing command: ${commandData.command}`,
					createdAt: new Date().toISOString(),
				},
			],
			urlId: commandData.sub_dir || "general",
			description: `Cloning file: ${commandData.path}`,
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
