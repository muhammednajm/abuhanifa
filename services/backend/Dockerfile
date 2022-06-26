FROM denoland/deno:1.20.2
EXPOSE 4000
WORKDIR /app
USER deno
ADD . .
RUN deno cache index.ts
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "index.ts"]
