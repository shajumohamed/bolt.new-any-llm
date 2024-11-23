import { openDatabase } from "~/lib/persistence/db";

export async function backupDatabase() {
	const db = await openDatabase();
	if (!db) {
		alert("Failed to open database.");
		return;
	}
	const transaction = db.transaction("chats", "readonly");
	const store = transaction.objectStore("chats");
	const getAllRequest = store.getAll();
	getAllRequest.onsuccess = () => {
		const data = getAllRequest.result;
		const jsonData = JSON.stringify(data, null, 2);
		navigator.clipboard
			.writeText(jsonData)
			.then(() => {
				console.log("Data copied to clipboard.");
			})
			.catch((err) => {
				console.error("Failed to copy to clipboard: ", err);
			});
		const blob = new Blob([jsonData], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "boltHistoryBackup.json";
		document.body.appendChild(a);
		a.click();
		a.remove();
		alert(
			"Backup completed: Data copied to clipboard and downloaded as a file.",
		);
	};
	getAllRequest.onerror = () => {
		alert("Failed to retrieve data for backup.");
	};
}

export async function restoreDatabase() {
	const db = await openDatabase();
	if (!db) {
		alert("Failed to open database.");
		return;
	}
	const existingDataTransaction = db.transaction("chats", "readonly");
	const existingDataStore = existingDataTransaction.objectStore("chats");
	const getAllRequest = existingDataStore.getAll();
	getAllRequest.onsuccess = () => {
		const newData = prompt("Paste your JSON data to restore:\n(A backup before restore will be taken for you)");
		if (!newData) {
			alert("Restore canceled.");
			return;
		}
		const existingData = getAllRequest.result;
		const backupData = JSON.stringify(existingData, null, 2);
		const blob = new Blob([backupData], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "boltHistoryBackupBeforeRestore.json";
		document.body.appendChild(a);
		a.click();
		a.remove();
		try {
			const parsedData = JSON.parse(newData);
			const transaction = db.transaction("chats", "readwrite");
			const store = transaction.objectStore("chats");
			const clearRequest = store.clear();
			clearRequest.onsuccess = () => {
				for (const item of parsedData) {
					store.put(item);
				}
				transaction.oncomplete = () => {
					alert("Restore completed successfully.");
				};
			};
			clearRequest.onerror = () => {
				alert("Failed to clear existing data.");
			};
		} catch (error) {
			alert("Invalid JSON format. Restore aborted.");
		}
	};
	getAllRequest.onerror = () => {
		alert("Failed to retrieve existing data for backup.");
	};
}

// Example usage
// Call backupDatabase() to back up your data
// Call restoreDatabase() to restore your data
