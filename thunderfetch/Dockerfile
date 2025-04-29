FROM alpine
RUN apk add jq wget ca-certificates
COPY thunderfetch.sh /
VOLUME /mnt/titanfall
WORKDIR /mnt/titanfall
ENTRYPOINT ["/bin/ash", "-c", "test -f ok || ash /thunderfetch.sh && touch ok"]