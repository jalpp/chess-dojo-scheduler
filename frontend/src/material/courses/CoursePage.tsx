import { useEffect, useMemo } from 'react';
import { Box, Button, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';

import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { Course, CourseType } from '../../database/course';
import LoadingPage from '../../loading/LoadingPage';
import Module from './Module';
import NotFoundPage from '../../NotFoundPage';
import Contents from './Contents';
import { GetCourseResponse } from '../../api/courseApi';
import PurchaseCoursePage from './PurchaseCoursePage';

type CoursePageParams = {
    type: CourseType;
    id: string;
};

const CoursePage = () => {
    const api = useApi();
    const params = useParams<CoursePageParams>();
    const request = useRequest<GetCourseResponse>();
    const [searchParams, setSearchParams] = useSearchParams({
        chapter: '0',
        module: '0',
    });

    useEffect(() => {
        if (!request.isSent() && params.type && params.id) {
            request.onStart();
            api.getCourse(params.type, params.id)
                .then((resp) => {
                    request.onSuccess(resp.data);
                    console.log('getCourse: ', resp);
                })
                .catch((err) => {
                    request.onFailure(err);
                    console.error('getCourse: ', err);
                });
        }
    }, [request, api, params]);

    const chapterIndex = parseInt(searchParams.get('chapter') || '0');
    const { course, isBlocked } = request.data || {};
    const chapter = useMemo(() => {
        return course?.chapters ? course.chapters[chapterIndex] : undefined;
    }, [course, chapterIndex]);

    const moduleIndex = parseInt(searchParams.get('module') || '0');
    const module = useMemo(() => {
        if (moduleIndex >= 0 && moduleIndex < (chapter?.modules.length || 0)) {
            return chapter?.modules[moduleIndex];
        }
    }, [chapter, moduleIndex]);

    if (isBlocked) {
        return <PurchaseCoursePage course={course} />;
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (course === undefined || chapter === undefined || module === undefined) {
        return <NotFoundPage />;
    }

    const prevModule = getPreviousModule(chapterIndex, moduleIndex, course);
    const nextModule = getNextModule(chapterIndex, moduleIndex, course);

    return (
        <Container maxWidth={false} sx={{ pt: 6, pb: 4 }}>
            <Grid container rowGap={2}>
                <Grid item xs={12} sm={12} md={9.5}>
                    <Stack>
                        <Typography variant='h4'>{course.name}</Typography>
                        <Typography variant='h5' color='text.secondary'>
                            {course.cohortRange}
                        </Typography>
                        <Divider />

                        <Box mt={2}>
                            <Module module={module} />
                        </Box>
                    </Stack>

                    <Stack
                        direction='row'
                        justifyContent='space-between'
                        mt={4}
                        px={{ xs: 0, md: 4 }}
                    >
                        {prevModule && (
                            <Button
                                variant='contained'
                                onClick={() =>
                                    setSearchParams({
                                        chapter: prevModule.chapterIndex,
                                        module: prevModule.moduleIndex,
                                    })
                                }
                            >
                                Previous: {prevModule.name}
                            </Button>
                        )}

                        {nextModule && (
                            <Button
                                variant='contained'
                                onClick={() =>
                                    setSearchParams({
                                        chapter: nextModule.chapterIndex,
                                        module: nextModule.moduleIndex,
                                    })
                                }
                            >
                                Next: {nextModule.name}
                            </Button>
                        )}
                    </Stack>
                </Grid>

                <Grid item xs={12} sm={12} md={2.5}>
                    <Contents course={course} />
                </Grid>
            </Grid>
            <RequestSnackbar request={request} />
        </Container>
    );
};

function getPreviousModule(chapterIndex: number, moduleIndex: number, course: Course) {
    if (chapterIndex === 0 && moduleIndex === 0) {
        return undefined;
    }

    if (moduleIndex === 0) {
        const prevModuleIndex = course.chapters![chapterIndex - 1].modules.length - 1;
        return {
            chapterIndex: `${chapterIndex - 1}`,
            moduleIndex: `${prevModuleIndex}`,
            name: course.chapters![chapterIndex - 1].modules[prevModuleIndex].name,
        };
    }

    return {
        chapterIndex: `${chapterIndex}`,
        moduleIndex: `${moduleIndex - 1}`,
        name: course.chapters![chapterIndex].modules[moduleIndex - 1].name,
    };
}

function getNextModule(chapterIndex: number, moduleIndex: number, course: Course) {
    if (
        chapterIndex === course.chapters!.length - 1 &&
        moduleIndex === course.chapters![chapterIndex].modules.length - 1
    ) {
        return undefined;
    }

    if (moduleIndex === course.chapters![chapterIndex].modules.length - 1) {
        return {
            chapterIndex: `${chapterIndex + 1}`,
            moduleIndex: '0',
            name: course.chapters![chapterIndex + 1].modules[0].name,
        };
    }

    return {
        chapterIndex: `${chapterIndex}`,
        moduleIndex: `${moduleIndex + 1}`,
        name: course.chapters![chapterIndex].modules[moduleIndex + 1].name,
    };
}

export default CoursePage;