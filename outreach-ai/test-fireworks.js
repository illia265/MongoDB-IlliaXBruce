const https = require('https');

const apiKey = 'fw_Jr1MVqCMuhCoaKafKpp3AQ';

const options = {
    hostname: 'api.fireworks.ai',
    path: '/inference/v1/models',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ Models List Retrieved:');
            try {
                const data = JSON.parse(body);
                // Print regular models (not user uploaded ones unless empty)
                const publicModels = data.data.filter(m => !m.id.startsWith('accounts/ishkliar'));

                if (publicModels.length > 0) {
                    console.log('Available Public Models:');
                    publicModels.forEach(m => console.log(`- ${m.id}`));
                } else {
                    console.log('No public models found (strange). All models:');
                    data.data.forEach(m => console.log(`- ${m.id}`));
                }
            } catch (e) {
                console.error('Failed to parse response:', e);
                console.log('Raw body:', body);
            }
        } else {
            console.log(`❌ FAILED to list models (${res.statusCode}) - ${body}`);
        }
    });
});

req.on('error', (error) => {
    console.error(`Error listing models:`, error);
});

req.end();
