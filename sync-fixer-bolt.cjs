const https = require('node:https');
const readline = require('node:readline');
const fs = require('node:fs');

const parseGitHubUrl = (url) => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL format");
  return { owner: match[1], repo: match[2] };
};

const fetchData = (url, options) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(data));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

const getRawFileLinks = async (url) => {
  try {
    const { owner, repo } = parseGitHubUrl(url);
    const branch = "main";
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeData = await fetchData(apiUrl, {
      headers: {
        'User-Agent': 'Node.js - Manual Webcontainers Clone-Like Behavior for bolt.new-any-llm users',
      },
    });
    const files = treeData.tree.filter((item) => item.type === "blob");
    const rawLinks = files.map((file) => ({
      link: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
      path: file.path,
    }));
    const scriptContent = rawLinks.map(({ link, path }) => {
      const dir = path.includes('/') ? `mkdir -p "${path.substring(0, path.lastIndexOf('/'))}" && ` : '';
      return `${dir}curl -o "${path}" "${link}"`;
    }).join('\n');
    fs.writeFileSync(`Cloner_${owner}_${repo}.txt`, scriptContent, 'utf-8');
    console.log('Script written to creator.txt');
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the GitHub repository URL: ", (url) => {
  getRawFileLinks(url).finally(() => rl.close());
});
