export const parseGitHubUrl = (url: string): { owner: string; repo: string } => {
	const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
	if (!match) throw new Error("Invalid GitHub URL format");
	return { owner: match[1], repo: match[2] };
};

export const generateCommands = (files: { path: string; link: string }[]): string[] => {
	return files
		.map(({ path, link }) => {
			const dir = path.includes("/")
				? `mkdir -p "${path.substring(0, path.lastIndexOf("/"))}" && `
				: "";
			return `${dir}curl -o "${path}" "${link}"`;
		});
};
