FROM alpine
RUN apk add jq wget ca-certificates
COPY nsfetch.sh /
VOLUME /mnt/titanfall
WORKDIR /mnt/titanfall
ENTRYPOINT ["/bin/ash", "-c", "test -f ok || ash /nsfetch.sh && touch ok"]