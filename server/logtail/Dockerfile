FROM python:3.12-alpine
# Standard library only -- no pip install, nothing to audit or update.
COPY logtail.py /app/logtail.py
WORKDIR /app
EXPOSE 8080
CMD ["python3", "-u", "logtail.py"]
