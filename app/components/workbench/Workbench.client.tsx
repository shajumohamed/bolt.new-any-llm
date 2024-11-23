import { useStore } from "@nanostores/react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { computed } from "nanostores";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type {
	OnChangeCallback as OnEditorChange,
	OnScrollCallback as OnEditorScroll,
} from "~/components/editor/codemirror/CodeMirrorEditor";
import { IconButton } from "~/components/ui/IconButton";
import { PanelHeaderButton } from "~/components/ui/PanelHeaderButton";
import { Slider, type SliderOptions } from "~/components/ui/Slider";
import { workbenchStore, type WorkbenchViewType } from "~/lib/stores/workbench";
import { classNames } from "~/utils/classNames";
import { cubicEasingFn } from "~/utils/easings";
import { renderLogger } from "~/utils/logger";
import { EditorPanel } from "./EditorPanel";
import { Preview } from "./Preview";
import useViewport from "~/lib/hooks";
import { generateCommands, parseGitHubUrl } from "~/new/clone";
import { saveCommandToIndexedDB } from "~/new/save-cmd";

interface WorkspaceProps {
	chatStarted?: boolean;
	isStreaming?: boolean;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
	left: {
		value: "code",
		text: "Code",
	},
	right: {
		value: "preview",
		text: "Preview",
	},
};

const workbenchVariants = {
	closed: {
		width: 0,
		transition: {
			duration: 0.2,
			ease: cubicEasingFn,
		},
	},
	open: {
		width: "var(--workbench-width)",
		transition: {
			duration: 0.2,
			ease: cubicEasingFn,
		},
	},
} satisfies Variants;

export const Workbench = memo(
	({ chatStarted, isStreaming }: WorkspaceProps) => {
		renderLogger.trace("Workbench");

		const [isSyncing, setIsSyncing] = useState(false);

		const hasPreview = useStore(
			computed(workbenchStore.previews, (previews) => previews.length > 0),
		);
		const showWorkbench = useStore(workbenchStore.showWorkbench);
		const selectedFile = useStore(workbenchStore.selectedFile);
		const currentDocument = useStore(workbenchStore.currentDocument);
		const unsavedFiles = useStore(workbenchStore.unsavedFiles);
		const files = useStore(workbenchStore.files);
		const selectedView = useStore(workbenchStore.currentView);

		const isSmallViewport = useViewport(1024);

		const setSelectedView = (view: WorkbenchViewType) => {
			workbenchStore.currentView.set(view);
		};

		useEffect(() => {
			if (hasPreview) {
				setSelectedView("preview");
			}
		}, [hasPreview]);

		useEffect(() => {
			workbenchStore.setDocuments(files);
		}, [files]);

		const onEditorChange = useCallback<OnEditorChange>((update) => {
			workbenchStore.setCurrentDocumentContent(update.content);
		}, []);

		const onEditorScroll = useCallback<OnEditorScroll>((position) => {
			workbenchStore.setCurrentDocumentScrollPosition(position);
		}, []);

		const onFileSelect = useCallback((filePath: string | undefined) => {
			workbenchStore.setSelectedFile(filePath);
		}, []);

		const onFileSave = useCallback(() => {
			workbenchStore.saveCurrentDocument().catch(() => {
				toast.error("Failed to update file content");
			});
			// console.log("file save:", workbenchStore.currentDocument);
		}, []);

		const onFileReset = useCallback(() => {
			workbenchStore.resetCurrentDocument();
		}, []);

		const handleSyncFiles = useCallback(async () => {
			setIsSyncing(true);

			try {
				const directoryHandle = await window.showDirectoryPicker();
				await workbenchStore.syncFiles(directoryHandle);
				toast.success("Files synced successfully");
			} catch (error) {
				console.error("Error syncing files:", error);
				toast.error("Failed to sync files");
			} finally {
				setIsSyncing(false);
			}
		}, []);

		return (
			chatStarted && (
				<motion.div
					initial="closed"
					animate={showWorkbench ? "open" : "closed"}
					variants={workbenchVariants}
					className="z-workbench"
				>
					<div
						className={classNames(
							"fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier",
							{
								"w-full": isSmallViewport,
								"left-0": showWorkbench && isSmallViewport,
								"left-[var(--workbench-left)]": showWorkbench,
								"left-[100%]": !showWorkbench,
							},
						)}
					>
						<div className="absolute inset-0 px-2 lg:px-6">
							<div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
								<div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
									<Slider
										selected={selectedView}
										options={sliderOptions}
										setSelected={setSelectedView}
									/>
									<div className="ml-auto" />
									{selectedView === "code" && (
										<div className="flex overflow-y-auto">
											<PanelHeaderButton
												className="mr-1 text-sm"
												onClick={() => {
													workbenchStore.downloadZip();
												}}
											>
												<div className="i-ph:code" />
												Download
											</PanelHeaderButton>
											<PanelHeaderButton
												className="mr-1 text-sm"
												onClick={handleSyncFiles}
												disabled={isSyncing}
											>
												{isSyncing ? (
													<div className="i-ph:spinner" />
												) : (
													<div className="i-ph:cloud-arrow-down" />
												)}
												{isSyncing ? "Syncing..." : "Sync Files"}
											</PanelHeaderButton>
											<PanelHeaderButton
												className="mr-1 text-sm"
												onClick={() => {
													workbenchStore.toggleTerminal(
														!workbenchStore.showTerminal.get(),
													);
												}}
											>
												<div className="i-ph:terminal" />
												Terminal
											</PanelHeaderButton>
											<PanelHeaderButton
												className="mr-1 text-sm"
												onClick={() => {
													const repoName = prompt(
														"Please enter a name for your new GitHub repository:",
														"bolt-generated-project",
													);

													if (!repoName) {
														alert(
															"Repository name is required. Push to GitHub cancelled.",
														);
														return;
													}

													const githubUsername = prompt(
														"Please enter your GitHub username:",
													);

													if (!githubUsername) {
														alert(
															"GitHub username is required. Push to GitHub cancelled.",
														);
														return;
													}

													const githubToken = prompt(
														"Please enter your GitHub personal access token:",
													);

													if (!githubToken) {
														alert(
															"GitHub token is required. Push to GitHub cancelled.",
														);
														return;
													}

													workbenchStore.pushToGitHub(
														repoName,
														githubUsername,
														githubToken,
													);
												}}
											>
												<div className="i-ph:github-logo" />
												Push
											</PanelHeaderButton>
											<PanelHeaderButton
												onClick={async () => {
													const newRepoUrl = prompt("Enter repository URL:", "https://github.com/");
													if (!newRepoUrl) return;
													try {
														const { owner, repo } = parseGitHubUrl(newRepoUrl);
														const branch = "main"; // Default branch, can be enhanced
														const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
												
														const response = await fetch(apiUrl);
														if (!response.ok) throw new Error(`Failed to fetch repo data: ${response.statusText}`);
												
														const treeData: {
															tree: { path: string; type: string }[];
														} = await response.json();
												
														const files = treeData.tree.filter((item) => item.type === "blob").map((file) => ({
															path: file.path,
															link: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
														}));
												
														const slashes = location.pathname.split('/');
														const currentID = slashes[slashes.length - 1];
														const commands = generateCommands(files);
														// console.log("Executing Commands:\n", commands);
														const messages = [];
														let boltActions = '<boltArtifact id=\"create-file\" title=\"Create Initial Files\">\n  ';
														for (const commandData of commands) {
															console.log("Executing Command:\n", commandData);
															await workbenchStore.boltTerminal.executeCommand(`${new Date()}`, commandData.command);
															await new Promise(resolve => setTimeout(resolve, 300));
															let files = workbenchStore.files.get();
															console.log("file name:", `/home/project/${commandData.path}`)
															console.log("files:", files)
															let file = files[`/home/project/${commandData.path}`] as {
																content: string;
															};
															let timeout = 3;
															while (timeout > 0) {
																console.log("Retrying...")
																timeout -= 1;
																await new Promise(resolve => setTimeout(resolve, 300));
																files = workbenchStore.files.get();
																file = files[`/home/project/${commandData.path}`] as {
																	content: string;
																};
																if (file) break;
															}
															if (!file) throw new Error(`Failed to parse file: ${commandData.path}`)
															console.log("file:", file)
															const content = file.content;
															boltActions += `<boltAction type=\"file\" filePath=\"${commandData.path}\">${content}</boltAction>\n\n`;
														}
														boltActions += `<boltAction type=\"shell\">npm install</boltAction>\n\n`;
														boltActions += `<boltAction type=\"shell\">npm run dev</boltAction>\n\n`;
														boltActions += '</boltArtifact>\n\nCreated Initial Files';
														messages.push({
															role: "assistant",
															content: boltActions,
															createdAt: new Date().toISOString(),
														});
														await saveCommandToIndexedDB(currentID, messages);
														alert("Clone commands generated! Check the console for details.");
														if (confirm("You need to reload the page to see the changes, Do you want to reload now?")) {
															location.reload();
														}
													} catch (error) {
														console.error("Error:", error instanceof Error ? error.message : error);
														alert("Failed to clone repository.");
													}
												}}
												className="mr-1 text-sm"
											>
												<div className="i-ph:github-logo" />
												Clone
											</PanelHeaderButton>
										</div>
									)}
									<IconButton
										icon="i-ph:x-circle"
										className="-mr-1"
										size="xl"
										onClick={() => {
											workbenchStore.showWorkbench.set(false);
										}}
									/>
								</div>
								<div className="relative flex-1 overflow-hidden">
									<View
										initial={{ x: selectedView === "code" ? 0 : "-100%" }}
										animate={{ x: selectedView === "code" ? 0 : "-100%" }}
									>
										<EditorPanel
											editorDocument={currentDocument}
											isStreaming={isStreaming}
											selectedFile={selectedFile}
											files={files}
											unsavedFiles={unsavedFiles}
											onFileSelect={onFileSelect}
											onEditorScroll={onEditorScroll}
											onEditorChange={onEditorChange}
											onFileSave={onFileSave}
											onFileReset={onFileReset}
										/>
									</View>
									<View
										initial={{ x: selectedView === "preview" ? 0 : "100%" }}
										animate={{ x: selectedView === "preview" ? 0 : "100%" }}
									>
										<Preview />
									</View>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			)
		);
	},
);
interface ViewProps extends HTMLMotionProps<"div"> {
	children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
	return (
		<motion.div
			className="absolute inset-0"
			transition={viewTransition}
			{...props}
		>
			{children}
		</motion.div>
	);
});
