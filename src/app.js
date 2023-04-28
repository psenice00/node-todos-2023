import express from 'express'
import cookieParser from 'cookie-parser'
import { createUser, db, getUserByToken, getUserByPassword } from './database.js'
import { sendTodoDeletedToAllConnections, sendTodoToAllConnections, sendTodosToAllConnections } from './websockets.js'

export const app = express()

app.set('view engine', 'ejs')

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(async (req, res, next) => {
  const token = req.cookies.token
  if (token) {
    res.locals.user = await getUserByToken(token)
  } else {
    res.locals.user = null
  }

  next()
})

const usetUserFromToken = async (token) => {
  if (token) {
    return await getUserByToken(token)
  } else {
    return null
  }
}


const requiresAuth = (req, res, next) => {
  if (res.locals.user) {
    next()
  } else {
    res.redirect('/register')
  }
}

app.get('/', async (req, res) => {
  const user = await usetUserFromToken(req.cookies.token)
  const query = db('todos').select('*')

  if (req.query.done) {
    query.where('done', req.query.done === 'true')
  }

  if(user?.id) {
    query.where('userId', user.id)
  } else {
    query.whereNull('userId')
  }

  const todos = await query

  return res.render('index', {
    todos: todos,
  })
})

app.post('/new-todo', async (req, res) => {
  const user = await usetUserFromToken(req.cookies.token)
  const newTodo = {
    title: (req.body.title || '').trim(),
    deadline: req.body.deadline || null,
    userId: user?.id ? user.id : null,
  }

  if (!newTodo.title) {
    return res.status(400).render('400', {
      error: 'Zadejte název todočka!',
    })
  }

  await db('todos').insert(newTodo)

  sendTodosToAllConnections(user?.id ? user.id : null)

  res.redirect('/')
})

app.get('/remove-todo/:id', async (req, res, next) => {
  const user = await usetUserFromToken(req.cookies.token)

  const idToRemove = Number(req.params.id)

  const query = db('todos').select('*').where('id', idToRemove)

  if(user?.id) {
    query.where('userId', user.id)
  } else {
    query.whereNull('userId')
  }

  const todoToToggle = await query.first()

  if (!todoToToggle) return next()

  await db('todos').delete().where('id', idToRemove)

  sendTodosToAllConnections(todoToToggle?.userId ? todoToToggle.userId : null)
  sendTodoDeletedToAllConnections(idToRemove, todoToToggle?.userId ? todoToToggle.userId : null)

  res.redirect('/')
})

app.get('/toggle-todo/:id', async (req, res, next) => {
  const user = await usetUserFromToken(req.cookies.token)

  const idToToggle = Number(req.params.id)

  const query = db('todos').select('*').where('id', idToToggle)

  if(user?.id) {
    query.where('userId', user.id)
  } else {
    query.whereNull('userId')
  }

  const todoToToggle = await query.first()

  if (!todoToToggle) return next()

  await db('todos').update({ done: !todoToToggle.done }).where('id', idToToggle)

  sendTodosToAllConnections(user?.id)
  sendTodoToAllConnections(idToToggle, user?.id)

  res.redirect('back')
})

app.get('/detail-todo/:id', async (req, res, next) => {
  const user = await usetUserFromToken(req.cookies.token)
  const idToShow = Number(req.params.id)

  const query = db('todos').select('*').where('id', idToShow)

  if(user?.id) {
    query.where('userId', user.id)
  } else {
    query.whereNull('userId')
  }
  const todoToShow = await query.first()

  if (!todoToShow) return next()

  res.render('detail', {
    todo: todoToShow,
  })
})

app.post('/update-todo/:id', async (req, res, next) => {
  const idToUpdate = Number(req.params.id)
  const newTitle = String(req.body.title)
  const user = await usetUserFromToken(req.cookies.token)

  const query = db('todos').select('*').where('id', idToUpdate)

  if(user?.id) {
    query.where('userId', user.id)
  } else {
    query.whereNull('userId')
  }

  const todoToUpdate = await query.first()

  if (!todoToUpdate) return next()

  await db('todos').update({ title: newTitle }).where('id', idToUpdate)

  sendTodosToAllConnections(user?.id)
  sendTodoToAllConnections(idToUpdate, user?.id)

  res.redirect('back')
})

app.get('/register', (req, res) => {
  res.render('register')
})

app.post('/register', async (req, res) => {
  const user = await createUser(req.body.username, req.body.password)

  res.cookie('token', user.token)

  res.redirect('/')
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.post('/login', async (req, res) => {
  const user = await getUserByPassword(req.body.username, req.body.password)

  if(user){
    res.cookie('token', user.token)
    res.redirect('/')
  } else {
    res.redirect('/login')
  }
})

app.get('/logout', (req, res) => {
  res.clearCookie('token')
  res.redirect('/')
})

app.use((req, res) => {
  res.status(404).render('404')
})
