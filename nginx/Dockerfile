FROM nginx:alpine

# Install openssl untuk generate self-signed certificate
RUN apk add --no-cache openssl

# Generate self-signed SSL certificate saat build
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=ID/ST=Jakarta/L=Jakarta/O=JasaMarga/OU=TollSystem/CN=192.168.110.195"

# Copy konfigurasi nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443
