package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"github.com/ricochet2200/go-disk-usage/du"
)

var contentPath string = "./content"
var diskUsage *du.DiskUsage
var uploadUsers = make(map[string]string)

type ErrorResponse struct {
	Success bool   `json:"success"`
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func SendJSONMessage(w http.ResponseWriter, status int, message string) {

	// Convert into JSON
	jsonString, err := json.Marshal(ErrorResponse{
		Success: status < 400,
		Code:    status,
		Message: message,
	})

	if err != nil {
		// Send Error to Client
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Internal Error: " + err.Error()))
	} else {
		// Send JSON to Client
		w.WriteHeader(status)
		w.Write(jsonString)
	}

}

func main() {

	// Get Content Directory
	if env := os.Getenv("CDN_CONTENT_DIR"); env != "" {
		contentPath = path.Join(env)
	}
	diskUsage = du.NewDiskUsage(contentPath)
	if diskUsage == nil {
		log.Fatal("Disk usage returned nil, ensure your path is valid.")
	}

	// Register Users from Environment
	// (e.g. "someUser=yourPassword,otherUser=theirPassword")
	if env := os.Getenv("CDN_USERS"); env != "" {
		for _, userStrings := range strings.Split(env, ",") {

			// Retrieve Username & Password from Values
			values := strings.Split(userStrings, "=")
			username := values[0]
			password := values[1]

			// Add to User Map
			uploadUsers[username] = password
			log.Printf("Registered User: '%s'", username)
		}
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		reqStarted := time.Now()
		resStatus := http.StatusOK

		switch r.Method {

		// Get File from Disk/Memory
		case http.MethodGet:

			// Get Homepage at root
			if r.URL.Path == "/" {
				// Service is Online!
				SendJSONMessage(w, http.StatusOK, "Delivering content at lightspeed! https://cdn.robobot.dev/")
				break
			}

			// Read File from Disk
			filePath := path.Join(contentPath, path.Clean(r.URL.Path))
			if fileData, err := os.ReadFile(filePath); err == nil {

				_, fileName := path.Split(filePath)
				ContentType := http.DetectContentType(fileData)
				ContentDisposition := fmt.Sprintf("attachment; filename=\"%s\"", fileName)

				// Send file to User
				w.Header().Set("Content-Type", ContentType)
				w.Header().Set("Content-Disposition", ContentDisposition)
				w.WriteHeader(http.StatusOK)
				w.Write(fileData)

			} else {
				// File Reading Errors
				if errors.Is(err, os.ErrNotExist) {
					resStatus = http.StatusNotFound
					SendJSONMessage(w, resStatus, "File Not Found")
				} else if errors.Is(err, os.ErrPermission) {
					resStatus = http.StatusNotFound
					SendJSONMessage(w, resStatus, "Missing Permissions")
				} else if errors.Is(err, os.ErrInvalid) {
					resStatus = http.StatusBadRequest
					SendJSONMessage(w, resStatus, "Invalid Arguments")
				} else {
					resStatus = http.StatusInternalServerError
					SendJSONMessage(w, resStatus, "Unknown Error")
				}
			}

		// Upload/Delete file
		case http.MethodPost, http.MethodDelete:

			// Parse Authorization Header
			givenUsername, givenPassword, ok := r.BasicAuth()
			if !ok {
				// Invalid Authorization Header
				resStatus = http.StatusUnauthorized
				SendJSONMessage(w, resStatus, "Missing Authorization")
				break
			}

			// Find Related User with that username
			userPassword, userExists := uploadUsers[givenUsername]
			if !userExists {
				// Incorrect Username Given
				resStatus = http.StatusUnauthorized
				SendJSONMessage(w, resStatus, "Incorrect Username/Password")
				break
			}

			// Ensure Users password matches
			if userPassword != givenPassword {
				// Incorrect Password Given
				resStatus = http.StatusUnauthorized
				SendJSONMessage(w, resStatus, "Incorrect Username/Password")
				break
			}

			// User is uploading files
			if r.Method == http.MethodPost {
				// Create file names and paths
				fileName := r.URL.Query().Get("filename")
				fileDir := path.Join(contentPath, r.URL.Path)
				filePath := path.Join(fileDir, fileName)
				if fileName == "" {
					// Missing File name
					resStatus = http.StatusBadRequest
					SendJSONMessage(w, resStatus, "Missing query 'filename'")
					break
				}

				// Ensure file is not in use
				if r.URL.Query().Get("overwrite") == "" {
					if _, err := os.Stat(filePath); !errors.Is(err, os.ErrNotExist) {
						// Unable to create folders
						resStatus = http.StatusConflict
						SendJSONMessage(w, resStatus, "File already exists, overwrite it using the 'overwrite' parameter")
						break
					}
				}

				// Create Required Folders
				err := os.MkdirAll(fileDir, 0600)
				if err != nil {
					// Unable to create folders
					resStatus = http.StatusInternalServerError
					SendJSONMessage(w, resStatus, "mkdirall: "+err.Error())
					break
				}

				// Read Request Body
				givenContent, err := io.ReadAll(r.Body)
				if err != nil {
					// Unable to Read Request Body
					resStatus = http.StatusInternalServerError
					SendJSONMessage(w, resStatus, "ioutil.readall: "+err.Error())
					break
				}

				// Ensure enough space is on disk
				if len(givenContent) > int(diskUsage.Available()) {
					resStatus = http.StatusInsufficientStorage
					SendJSONMessage(w, resStatus, "Insufficient Storage")
					break
				}

				// Write File to Disk
				if err = os.WriteFile(filePath, givenContent, 0600); err != nil {
					resStatus = http.StatusInternalServerError
					SendJSONMessage(w, resStatus, "os.writefile: "+err.Error())
					break
				}

				// Send Response
				resStatus = http.StatusCreated
				SendJSONMessage(w, resStatus, "Data Written")
				break

				// User is deleting files
			} else if r.Method == http.MethodDelete {
				// Ensure file exists
				filePath := path.Join(contentPath, path.Clean(r.URL.Path))
				if _, err := os.Stat(filePath); errors.Is(err, os.ErrNotExist) {
					// This file does not exist
					resStatus = http.StatusNotFound
					SendJSONMessage(w, resStatus, "File does not exist")
					break
				}

				// Delete file from Disk
				if err := os.Remove(filePath); err != nil {
					// Unable to delete file
					resStatus = http.StatusInternalServerError
					SendJSONMessage(w, resStatus, "os.remove: "+err.Error())
					break
				}

				// File was Deleted
				resStatus = http.StatusAccepted
				SendJSONMessage(w, resStatus, "File Deleted")
				break
			}

		// Unsupported Method
		default:
			resStatus = http.StatusMethodNotAllowed
			SendJSONMessage(w, resStatus, "Method Not Allowed")
		}

		// Request Logging Function
		log.Printf(
			"| %s | %-6s | %10s | %s ",
			strconv.Itoa(resStatus),
			r.Method,
			time.Since(reqStarted),
			r.URL.RequestURI(),
		)
	})

	// HTTP Server failed to start
	log.Print("Starting HTTP Server @ :8000")
	if err := http.ListenAndServe(":8000", nil); err != nil {
		log.Fatal("Startup failed", err)
	}

}
