
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

a pycharm .

osascript 2>/dev/null <<EOF

    tell application "System Events"
        tell process "Terminal" to keystroke "t" using command down
    end
    tell application "Terminal"
        activate
        do script with command "cd \"$DIR/server\"; $*" in window 0
        do script with command "nodemon --watch src src/bin/www" in window 0
    end

    tell application "System Events"
        tell process "Terminal" to keystroke "t" using command down
    end
    tell application "Terminal"
        activate
        do script with command "cd \"$DIR/client\"; $*" in window 0
        do script with command "npm run dev" in window 0
    end

EOF
