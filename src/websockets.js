import ejs from 'ejs'
import { WebSocketServer, WebSocket } from 'ws'
import { db, getUserByToken } from './database.js'

/** @type {Set<WebSocket>} */
const connections = new Set()

export const createWebSocketServer = (server) => {
  const wss = new WebSocketServer({ server })

  wss.on('connection', async (ws, request) => {
    if(request.headers.cookie?.includes('token')) {
      const token = request.headers.cookie.split('=')[1]
      const user = await getUserByToken(token)
      connections.add({socket: ws, userId: user.id})
    } else {
      connections.add({socket: ws, userId: null})
    }
    console.log('New connection', connections.size)

    ws.on('close', () => {
      connections.forEach(instance => {
        if (instance.socket === ws) {
          connections.delete(instance);
        }
      });

      console.log('Closed connection', connections.size)
    })
  })
}

export const sendTodosToAllConnections = async (userId) => {
  try {
    const query = db('todos').select('*')

    if(userId) {
      query.where('userId', userId)
    } else {
      query.whereNull('userId')
    }
    const todos = await query

    const html = await ejs.renderFile('views/_todos.ejs', {
      todos,
    })

    const message = {
      type: 'todos',
      html,
    }

    for (const connection of connections) {
      if(!userId && !connection.userId) {
        connection.socket.send(JSON.stringify(message))
      } else if(userId && userId === connection.userId) {
        connection.socket.send(JSON.stringify(message))
      }
    }
  } catch (e) {
    console.error(e)
  }
}

export const sendTodoToAllConnections = async (id, userId) => {
  try {

    const query = db('todos').select('*')

    if(userId) {
      query.where('userId', userId)
    } else {
      query.whereNull('userId')
    }

    const todo = await query.where('id', id).first()

    const html = await ejs.renderFile('views/_todo.ejs', {
      todo,
    })

    const message = {
      type: 'todo',
      id,
      html,
    }

    for (const connection of connections) {
        if(!userId && !connection.userId) {
          connection.socket.send(JSON.stringify(message))
        } else if(userId && userId === connection.userId) {
          connection.socket.send(JSON.stringify(message))
        }
    }
  } catch (e) {
    console.error(e)
  }
}

export const sendTodoDeletedToAllConnections = async (id, userId) => {
  try {
    const message = {
      type: 'todo-deleted',
      id,
    }

    for (const connection of connections) {
      if(!userId && !connection.userId) {
        connection.socket.send(JSON.stringify(message))
      } else if(userId && userId === connection.userId) {
        connection.socket.send(JSON.stringify(message))
      }
    }
  } catch (e) {
    console.error(e)
  }
}
