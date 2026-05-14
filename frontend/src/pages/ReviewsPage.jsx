import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid
} from '@mui/material'

import {
  useEffect,
  useState
} from 'react'

import {
  getReviews
} from '../services/api'

export default function ReviewsPage() {

  const [reviews, setReviews] =
    useState([])

  const [employeeName, setEmployeeName] =
    useState('Alex')

  useEffect(() => {

    const loadReviews = async () => {

      const user =
        JSON.parse(
          localStorage.getItem('user')
        )

      const firstName =
        user?.name?.split(' ')[0]
        ||
        'Alex'

      setEmployeeName(firstName)

      const res =
        await getReviews()

      const updated =
        (res.data || []).map(r => ({
          ...r,
          employee_name: firstName
        }))

      setReviews(updated)

    }

    loadReviews()

  }, [])

  const avg =
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
    <Box>

      <Typography
        variant="h3"
        fontWeight={700}
        mb={1}
      >
        Performance Reviews
      </Typography>

      <Typography
        variant="h6"
        color="text.secondary"
        mb={4}
      >
        Showing reviews for {employeeName}
      </Typography>

      <Grid
        container
        spacing={3}
        mb={4}
      >

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography>Total Reviews</Typography>
            <Typography variant="h3">
              {reviews.length}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography>Average Rating</Typography>
            <Typography variant="h3">
              {avg}
            </Typography>
          </Paper>
        </Grid>

      </Grid>

      <TableContainer
        component={Paper}
      >

        <Table>

          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Reviewer</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Strengths</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>

            {reviews.map((review, index) => (

              <TableRow key={index}>

                <TableCell>
                  {employeeName}
                </TableCell>

                <TableCell>
                  {review.reviewer_name}
                </TableCell>

                <TableCell>
                  {review.period}
                </TableCell>

                <TableCell>
                  {review.rating}/5
                </TableCell>

                <TableCell>
                  {review.strengths}
                </TableCell>

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </TableContainer>

    </Box>
  )
}