// Types taken from node-fluent-ffmpeg 2.1

export interface ffprobeData {
    streams: ffprobeStream[];
    format: ffprobeFormat;
}

interface ffprobeStream {
    [key: string]: any;
    index: string;
    codec_name?: string;
    codec_long_name?: string;
    profile?: string;
    codec_type?: string;
    codec_time_base?: string;
    codec_tag_string?: string;
    codec_tag?: string;
    width?: string;
    height?: string;
    coded_width?: string;
    coded_height?: string;
    has_b_frames?: string;
    sample_aspect_ratio?: string;
    display_aspect_ratio?: string;
    pix_fmt?: string;
    level?: string;
    color_range?: string;
    color_space?: string;
    color_transfer?: string;
    color_primaries?: string;
    chroma_location?: string;
    field_order?: string;
    timecode?: string;
    refs?: string;
    id?: string;
    r_frame_rate?: string;
    avg_frame_rate?: string;
    time_base?: string;
    start_pts?: string;
    start_time?: string;
    duration_ts?: string;
    duration?: string;
    bit_rate?: string;
    max_bit_rate?: string;
    bits_per_raw_sample?: string;
    nb_frames?: string;
    nb_read_frames?: string;
    nb_read_packets?: string;
    sample_fmt?: string;
    sample_rate?: string;
    channels?: string;
    channel_layout?: string;
    bits_per_sample?: string;
    disposition?: ffprobeStreamDisposition;
    rotation?: string;
}

interface ffprobeStreamDisposition {
    [key: string]: any;
    default?: string;
    dub?: string;
    original?: string;
    comment?: string;
    lyrics?: string;
    karaoke?: string;
    forced?: string;
    hearing_impaired?: string;
    visual_impaired?: string;
    clean_effects?: string;
    attached_pic?: string;
    timed_thumbnails?: string;
}

interface ffprobeFormat {
    [key: string]: any;
    filename?: string;
    nb_streams?: string;
    nb_programs?: string;
    format_name?: string;
    format_long_name?: string;
    start_time?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
    probe_score?: string;
    tags?: Record<string, string>;
}