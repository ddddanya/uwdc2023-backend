const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const socketio = require('socket.io');

let usersOnline = []
const zones = [
    {
        id: 1,
        name: "The Office",
        topY: 50,
        bottomY: 360,
        leftX: 620,
        rightX: 950,
        maxUsers: 3
    },
    {
        id: 2,
        name: "Meeting Room",
        topY: 50,
        bottomY: 360,
        leftX: 1050,
        rightX: 1650,
        maxUsers: 15
    },
    {
        id: 3,
        name: "Desk",
        topY: 545,
        bottomY: 771,
        leftX: 375,
        rightX: 682,
        maxUsers: 3
    },
    {
        id: 4,
        name: "Silent Room 1",
        topY: 1058,
        bottomY: 1280,
        leftX: 1332,
        rightX: 1639,
        maxUsers: 1
    },
    {
        id: 5,
        name: "Open Office 1",
        topY: 525,
        bottomY: 1355,
        leftX: 457,
        rightX: 1611,
        maxUsers: 9
    },
    {
        id: 6,
        name: "Kitchen",
        topY: 650,
        bottomY:826,
        leftX: 1745,
        rightX: 2469,
        maxUsers: 5
    },
    {
        id: 7,
        name: "Silent Room 2",
        topY: 925,
        bottomY: 984,
        leftX: 1932,
        rightX: 2058,
        maxUsers: 1
    },
    {
        id: 8,
        name: "Break Room",
        topY: 50,
        bottomY: 422,
        leftX: 2810,
        rightX: 3155,
        maxUsers: 5
    },
    {
        id: 9,
        name: "Open Office 2",
        topY: 539,
        bottomY: 1010,
        leftX: 2567,
        rightX: 3155,
        maxUsers: 4
    },
    {
        id: 10,
        name: "Silent Room 3",
        topY: 1114,
        bottomY: 1310,
        leftX: 2747,
        rightX: 3155,
    }
]

const getRand = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
})

const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});

io.use((socket, next) => {
    const { avatar, username } = socket.handshake.query;

    if (!avatar || !username) {
        return next(new Error('Invalid username or avatar'));
    }

    next();
})

setInterval(() => {
    io.emit('users', usersOnline);

}, 60000)

setInterval(() => {
    for (let i = 0; i < usersOnline.length; i++) {
        if (usersOnline[i].disconnectedAt && !usersOnline[i].connected) {
            const disconnectedAt = new Date(usersOnline[i].disconnectedAt);
            const now = new Date();

            if (now - disconnectedAt > 30000) {
                usersOnline.splice(i, 1);
            }
        }
    }
}, 1000)

io.on('connection', (socket) => {
    const user = {
        avatar: socket.handshake.query.avatar,
        username: socket.handshake.query.username
    }

    if (!usersOnline.find((u) => u.user.username == user.username)) {
        const randomZone = zones[getRand(0, zones.length - 1)];
        const x = getRand(randomZone.leftX, randomZone.rightX);
        const y = getRand(randomZone.topY, randomZone.bottomY);

        usersOnline.push({
            id: socket.id,
            user,
            socket: socket.id,
            connected: true,
            x,
            y,
            zone: randomZone,
            connectedAt: new Date()
        })
    } else {
        usersOnline[usersOnline.findIndex((u) => u.user.username == user.username)].socket = socket.id;
        usersOnline[usersOnline.findIndex((u) => u.user.username == user.username)].connected = true;
        usersOnline[usersOnline.findIndex((u) => u.user.username == user.username)].disconnectedAt = null;

        const zone = usersOnline[usersOnline.findIndex((u) => u.user.username == user.username)].zone;
    }

    io.emit('users', usersOnline);

    socket.on('move', (data) => {
        const newZone = zones.find((z) => {
            return data.x >= z.leftX && data.x <= z.rightX && data.y >= z.topY && data.y <= z.bottomY;
        })

        // if (usersInZone.length >= newZone.maxUsers) {
        //     socket.emit('error', 'Too many users in this zone');
        //     socket.emit("return")
        //     return;
        // }

        usersOnline[usersOnline.findIndex((u) => u.socket == socket.id)].x = data.x;
        usersOnline[usersOnline.findIndex((u) => u.socket == socket.id)].y = data.y;

        usersOnline[usersOnline.findIndex((u) => u.socket == socket.id)].zone = newZone;

        io.emit('users', usersOnline);
    })

    socket.on('message', (message) => {
        console.log(message)
        if (!message) {
            return;
        }
        const user = usersOnline.find((u) => u.socket == socket.id);
        if (!user) {
            return;
        }
        if (!user.zone) {
            return;
        }
        console.log(user.zone, user)
        io.emit('message', {
            user,
            message,
            zone: user.zone
        })
    })

    socket.on('disconnect', () => {
        try {
            usersOnline[usersOnline.findIndex((u) => u.socket == socket.id)].disconnectedAt = new Date();
            usersOnline[usersOnline.findIndex((u) => u.socket == socket.id)].connected = false;

            io.emit('users', usersOnline);
        } catch (e) {
            console.log(e);
        }
    })
})