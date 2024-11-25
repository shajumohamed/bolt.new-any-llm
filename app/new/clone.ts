export const parseGitHubUrl = (url: string): { owner: string; repo: string } => {
	const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
	if (!match) throw new Error("Invalid GitHub URL format");
	return { owner: match[1], repo: match[2] };
};

export const generateCommands = (files: { path: string; link: string }[]): {
	command: string;
	link: string;
	path: string;
	dir: string;
	sub_dir: string;
}[] => {
	return files
		.map(({ path, link }) => {
			const sub_dir = path.substring(0, path.lastIndexOf("/"));
			const dir = path.includes("/")
				? `mkdir -p "${sub_dir}" && `
				: "";
			return {
				command: `${dir}curl -o "${path}" "${link}"`,
				link,
				path,
				dir,
				sub_dir
			};
		});
};
