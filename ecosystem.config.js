module.exports = {
    apps: [
        {
            name: 'ailabs-backend',
            cwd: '/var/www/yokaizen-ailabs/backend',
            script: 'dist/index.js',
            node_args: '--max-old-space-size=512',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env_production: {
                NODE_ENV: 'production',
                PORT: 7792
            }
        },
        {
            name: 'ailabs-frontend',
            cwd: '/var/www/yokaizen-ailabs/frontend',
            script: 'npx',
            args: 'serve -s dist -l tcp://127.0.0.1:7791',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true
        },
        {
            name: 'campus-backend',
            cwd: '/var/www/yokaizen-campus/backend',
            script: 'dist/index.js',
            node_args: '--max-old-space-size=512',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env_production: {
                NODE_ENV: 'production',
                PORT: 7789
            }
        },
        {
            name: 'campus-frontend',
            cwd: '/var/www/yokaizen-campus/frontend',
            script: 'npx',
            args: 'serve -s dist -l tcp://127.0.0.1:7787',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true
        }
    ]
}
