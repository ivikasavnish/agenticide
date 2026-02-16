// Docker Extension
const { Extension } = require('../core/extensionManager');
const { execSync } = require('child_process');

class DockerExtension extends Extension {
    constructor() {
        super();
        this.name = 'docker';
        this.version = '1.0.0';
        this.description = 'Docker container management';
        this.author = 'Agenticide';
        this.dockerInstalled = false;
        this.commands = [{ name: 'docker', description: 'Docker commands', usage: '/docker <action>' }];
    }

    async install() {
        try {
            execSync('docker --version', { stdio: 'pipe' });
            this.dockerInstalled = true;
            return { success: true };
        } catch { return { success: false, message: 'Docker not installed' }; }
    }

    async enable() {
        await this.install();
        this.enabled = true;
        return { success: true };
    }

    async execute(action, args) {
        if (!this.dockerInstalled) return { success: false, error: 'Docker not installed' };
        try {
            let output;
            switch (action) {
                case 'ps': output = execSync(args.includes('--all') ? 'docker ps -a' : 'docker ps', { encoding: 'utf8' }); break;
                case 'run': output = execSync(`docker run ${args.join(' ')}`, { encoding: 'utf8' }); break;
                case 'stop': output = execSync(`docker stop ${args[0]}`, { encoding: 'utf8' }); break;
                case 'logs': output = execSync(`docker logs ${args[0]}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }); break;
                case 'images': output = execSync('docker images', { encoding: 'utf8' }); break;
                default: return { success: false, error: `Unknown action: ${action}` };
            }
            return { success: true, output };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = DockerExtension;
