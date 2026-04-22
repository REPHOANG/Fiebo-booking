# Giai đoạn Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Giai đoạn Runtime
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy file config nginx nếu cần (tùy chọn)
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
