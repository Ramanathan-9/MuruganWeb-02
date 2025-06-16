#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import urllib.parse

PORT = 5000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        # Handle API config endpoint
        if self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Provide API configuration securely
            config = {
                'blockcypherToken': os.getenv('BLOCKCYPHER_API_KEY', ''),
                'electrumPassword': os.getenv('ELECTRUM_RPC_PASSWORD', ''),
                'hasBlockcypher': bool(os.getenv('BLOCKCYPHER_API_KEY')),
                'hasElectrum': bool(os.getenv('ELECTRUM_RPC_PASSWORD'))
            }
            
            self.wfile.write(json.dumps(config).encode())
            return
        
        # Default file serving
        super().do_GET()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Allow address reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Bitcoin Mining Simulator running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()