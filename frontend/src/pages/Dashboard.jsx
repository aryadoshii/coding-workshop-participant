import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material'

import {
  Star,
  School,
  Assignment,
  TrendingUp
} from '@mui/icons-material'

import {
  useEffect,
  useState
} from 'react'

import {
  getReviews,
  getTrainingRecords,
  getPlans
} from '../services/api'

import {
  generateEmployeeInsight
} from '../services/aiService'

export default function Dashboard() {

  const [reviews, setReviews] =
    useState([])

  const [training, setTraining] =
    useState([])

  const [plans, setPlans] =
    useState([])

  const [employeeName, setEmployeeName] =
    useState('Employee')

  const [aiInsight, setAiInsight] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {

    const loadData = async () => {

      try {

        const user =
          JSON.parse(
            localStorage.getItem('user')
          )

        const firstName =
          user?.name?.split(' ')[0]
          ||
          user?.email?.split('.')[0]
          ||
          'Employee'

        setEmployeeName(firstName)

        const reviewsRes =
          await getReviews()

        const trainingRes =
          await getTrainingRecords()

        const plansRes =
          await getPlans()

        const reviewsData =
          reviewsRes.data || []

        const trainingData =
          trainingRes.data || []

        const plansData =
          plansRes.data || []

        setReviews(reviewsData)
        setTraining(trainingData)
        setPlans(plansData)

        const insight =
          await generateEmployeeInsight({
            employee: firstName,
            reviews: reviewsData,
            training: trainingData,
            plans: plansData
          })

        setAiInsight(insight)

      } catch (err) {

        console.error(err)

      } finally {

        setLoading(false)

      }

    }

    loadData()

  }, [])

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (a, b) =>
              a + (b.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : 0

  return (

    <Box
      sx={{
        width: '100%',
        minHeight: '100vh'
      }}
    >

      <Typography
        variant="h2"
        fontWeight={700}
        mb={1}
      >
        Welcome back, {employeeName}
      </Typography>

      <Typography
        variant="h6"
        color="text.secondary"
        mb={5}
      >
        Track your growth, learning,
        and performance journey
      </Typography>

      <Grid
        container
        spacing={3}
      >

        {/* CARD 1 */}

        <Grid item xs={12} md={3}>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 5,
              height: '100%',
              background: '#fff',
              border:
                '1px solid #e2e8f0'
            }}
          >

            <Typography
              color="text.secondary"
            >
              Performance Rating
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={3}
            >

              <Typography
                variant="h2"
                fontWeight={700}
              >
                {avgRating}
              </Typography>

              <Star
                sx={{
                  fontSize: 48,
                  color: '#f59e0b'
                }}
              />

            </Box>

          </Paper>

        </Grid>

        {/* CARD 2 */}

        <Grid item xs={12} md={3}>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 5,
              height: '100%',
              background: '#fff',
              border:
                '1px solid #e2e8f0'
            }}
          >

            <Typography
              color="text.secondary"
            >
              Training Completed
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={3}
            >

              <Typography
                variant="h2"
                fontWeight={700}
              >
                {
                  training.filter(
                    t =>
                      t.status ===
                      'Completed'
                  ).length
                }
              </Typography>

              <School
                sx={{
                  fontSize: 48,
                  color: '#10b981'
                }}
              />

            </Box>

          </Paper>

        </Grid>

        {/* CARD 3 */}

        <Grid item xs={12} md={3}>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 5,
              height: '100%',
              background: '#fff',
              border:
                '1px solid #e2e8f0'
            }}
          >

            <Typography
              color="text.secondary"
            >
              Development Goals
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={3}
            >

              <Typography
                variant="h2"
                fontWeight={700}
              >
                {plans.length}
              </Typography>

              <Assignment
                sx={{
                  fontSize: 48,
                  color: '#9333ea'
                }}
              />

            </Box>

          </Paper>

        </Grid>

        {/* CARD 4 */}

        <Grid item xs={12} md={3}>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 5,
              height: '100%',
              background: '#fff',
              border:
                '1px solid #e2e8f0'
            }}
          >

            <Typography
              color="text.secondary"
            >
              Review Cycles
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={3}
            >

              <Typography
                variant="h2"
                fontWeight={700}
              >
                {reviews.length}
              </Typography>

              <TrendingUp
                sx={{
                  fontSize: 48,
                  color: '#ea580c'
                }}
              />

            </Box>

          </Paper>

        </Grid>

      </Grid>

      {/* AI BOX */}

      <Paper
        elevation={0}
        sx={{
          mt: 5,
          p: 4,
          borderRadius: 5,
          background:
            'linear-gradient(135deg,#0f172a,#1e293b)',
          color: 'white',
          border:
            '1px solid rgba(255,255,255,0.08)',
          boxShadow:
            '0 20px 50px rgba(15,23,42,0.3)'
        }}
      >

        <Typography
          variant="h5"
          fontWeight={700}
          mb={2}
        >
          AI Workforce Insights
        </Typography>

        {
          loading
          ? (
            <Box
              display="flex"
              alignItems="center"
              gap={2}
            >

              <CircularProgress
                size={22}
                sx={{
                  color: 'white'
                }}
              />

              <Typography>
                Generating workforce
                insights using Groq LLM...
              </Typography>

            </Box>
          )
          : (
            <Typography
              sx={{
                opacity: 0.92,
                lineHeight: 1.9,
                whiteSpace: 'pre-line'
              }}
            >
              {
                aiInsight ||
                'No AI insights generated.'
              }
            </Typography>
          )
        }

      </Paper>

    </Box>

  )

}