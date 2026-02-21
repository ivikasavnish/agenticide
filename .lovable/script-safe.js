// Lovable Design - Interactive UI
console.log('🎨 Lovable Design loaded!');

// Safe DOM access
if (typeof document !== 'undefined') {
    const btn = document.getElementById('demo-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            alert('Button clicked! Ask AI to make it better.');
        });
    }
}

// Connect to WebSocket for live updates (only in non-sandbox context)
try {
    if (typeof WebSocket !== 'undefined' && typeof location !== 'undefined') {
        const ws = new WebSocket('ws://' + location.host);
        
        ws.onopen = () => {
            console.log('✓ Connected to design server');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Message from server:', data);
            } catch (e) {
                console.error('Failed to parse server message:', e);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('Disconnected from server');
        };
    }
} catch (error) {
    console.warn('WebSocket not available in this context:', error.message);
}
