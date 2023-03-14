import express from 'express'

const app = express()

app.set('view engine', 'ejs')

app.use(express.urlencoded({ extended: true }))

let todos = [
  {
    id: Math.random(),
    title: 'Nakoupit jídlo',
    done: false,
  },
  {
    id: Math.random(),
    title: 'Nakoupit pivo',
    done: true,
  },
]

app.get('/', (req, res) => {
  res.render('index', {
    todos: todos,
  })
})

app.post('/new-todo', (req, res) => {
  const newTodo = {
    id: Math.random(),
    title: req.body.title,
    done: false,
  }

  todos.push(newTodo)

  res.redirect('/')
})

app.get('/remove-todo/:id', (req, res) => {
  const idToRemove = Number(req.params.id)

  todos = todos.filter((todo) => todo.id !== idToRemove)

  res.redirect('/')
})

app.get('/toggle-todo/:id', (req, res, next) => {
  const idToToggle = Number(req.params.id)

  const todoToToggle = todos.find((todo) => todo.id === idToToggle)

  if (!todoToToggle) return next()

  todoToToggle.done = !todoToToggle.done

  res.redirect('back')
})

app.get('/detail-todo/:id', (req, res, next) => {
  const idToShow = Number(req.params.id)

  const todoToShow = todos.find((todo) => todo.id === idToShow)

  if (!todoToShow) return next()

  res.render('detail', {
    todo: todoToShow,
  })
})

app.post('/update-todo/:id', (req, res, next) => {
  const idToUpdate = Number(req.params.id)
  const newTitle = String(req.body.title)

  const todoToUpdate = todos.find((todo) => todo.id === idToUpdate)

  if (!todoToUpdate) return next()

  todoToUpdate.title = newTitle

  res.redirect('back')
})

app.use((req, res) => {
  res.status(404).render('404')
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})
